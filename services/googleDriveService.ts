import { FullAppBackup, CloudFile } from '../types';

// Standard Google API configuration
const DISCOVERY_DOCS = ["https://www.googleapis.com/discovery/v1/apis/drive/v3/rest"];
// Scope for accessing only files created by this application, for better security and privacy.
const SCOPES = 'https://www.googleapis.com/auth/drive.file';

// Type definitions for Google API objects
declare global {
  namespace google {
    namespace accounts {
      namespace oauth2 {
        function initTokenClient(config: any): TokenClient;
        function revoke(token: string, callback: () => void): void;
      }
    }
  }
  namespace gapi {
    function load(api: string, callback: () => void): void;
    namespace client {
        function init(config: any): Promise<void>;
        function setToken(token: { access_token: string } | null): void;
        function getToken(): { access_token: string } | null;
        function request(args: any): Promise<any>;
        namespace drive {
            namespace files {
                function list(params: any): Promise<any>;
                function get(params: any): Promise<any>;
            }
        }
    }
  }
  interface TokenClient {
    callback: (resp: any) => void;
    requestAccessToken: (options: { prompt: string }) => void;
  }
}


let tokenClient: TokenClient | null = null;
let gapiClientInitialized = false;

/**
 * Dynamically loads a script tag into the document body.
 */
function loadScript(src: string): Promise<void> {
    return new Promise((resolve, reject) => {
        const existingScript = document.querySelector(`script[src="${src}"]`);
        if (existingScript) {
            return resolve();
        }
        const script = document.createElement('script');
        script.src = src;
        script.async = true;
        script.defer = true;
        script.onload = () => resolve();
        script.onerror = () => reject(new Error(`Failed to load script: ${src}`));
        document.body.appendChild(script);
    });
}

/**
 * Initializes the Google API clients with the provided credentials.
 * This should only be called once per application load.
 */
export const init = async (apiKey?: string, clientId?: string) => {
    if (gapiClientInitialized) return;

    if (!clientId) {
        throw new Error("Google Drive Client ID must be provided for initialization.");
    }

    try {
        await Promise.all([
            loadScript('https://apis.google.com/js/api.js'),
            loadScript('https://accounts.google.com/gsi/client')
        ]);
        
        await new Promise<void>((resolve) => gapi.load('client', resolve));
        
        let clientLoaded = false;
        if (apiKey && apiKey.trim()) {
            try {
                await gapi.client.init({ apiKey, discoveryDocs: DISCOVERY_DOCS });
                clientLoaded = true;
            } catch (apiKeyErr) {
                console.warn("gapi.client.init failed with provided apiKey, retrying without apiKey:", apiKeyErr);
            }
        }

        if (!clientLoaded) {
            await gapi.client.init({ discoveryDocs: DISCOVERY_DOCS });
        }
        
        tokenClient = google.accounts.oauth2.initTokenClient({
            client_id: clientId,
            scope: SCOPES,
            callback: '', // Will be defined dynamically
        });

        gapiClientInitialized = true;
    } catch (error) {
        console.warn("Google Drive service initialization notice:", error);
        gapiClientInitialized = false;
        throw new Error("Failed to load or initialize Google API scripts.");
    }
};

const ensureInitialized = () => {
    if (!gapiClientInitialized) {
        throw new Error("Google Drive service has not been initialized. Please configure API keys in settings.");
    }
};

/**
 * Attempts a silent sign-in. This is used on page load to restore a user's session.
 * @returns A promise that resolves to `true` if sign-in was successful, `false` otherwise.
 */
export const trySilentSignIn = (): Promise<boolean> => {
    ensureInitialized();
    return new Promise((resolve, reject) => {
        if (!tokenClient) {
            return reject(new Error('Google Auth is not initialized.'));
        }

        tokenClient.callback = (resp) => {
            if (resp.error) {
                // This is an expected outcome if the user needs to sign in explicitly.
                gapi.client.setToken(null);
                resolve(false);
                return;
            }
            gapi.client.setToken({ access_token: resp.access_token });
            resolve(true); // Silent sign-in was successful.
        };
        
        tokenClient.requestAccessToken({ prompt: '' });
    });
};


/**
 * Initiates the Google Sign-In flow with a user prompt.
 */
export const signIn = (): Promise<void> => {
    ensureInitialized();
    return new Promise((resolve, reject) => {
        if (!tokenClient) {
            return reject(new Error('Google Auth is not initialized.'));
        }

        tokenClient.callback = (resp) => {
            if (resp.error) {
                return reject(resp);
            }
            gapi.client.setToken({ access_token: resp.access_token });
            resolve();
        };

        // 'consent' prompt ensures the user sees the sign-in/permission screen.
        tokenClient.requestAccessToken({ prompt: 'consent' });
    });
};

/**
 * Signs the user out.
 */
export const signOut = () => {
    ensureInitialized();
    const token = gapi.client.getToken();
    if (token !== null) {
        google.accounts.oauth2.revoke(token.access_token, () => {
            gapi.client.setToken(null);
        });
    }
};

/**
 * Fetches the profile information of the signed-in user.
 */
export const getSignedInUser = async (): Promise<{ name: string; email: string; picture: string } | null> => {
    ensureInitialized();
    try {
        const response = await gapi.client.request({
            path: 'https://www.googleapis.com/oauth2/v2/userinfo'
        });
        return response.result;
    } catch (e) {
        console.error("Error getting user profile:", e);
        return null;
    }
};

/**
 * Uploads the application backup data to Google Drive.
 */
export const uploadBackup = async (backupData: FullAppBackup): Promise<void> => {
    ensureInitialized();
    const backupContent = JSON.stringify(backupData, null, 2);
    const fileName = `BManager_Backup_${new Date().toISOString().replace(/:/g, '-')}.json`;
    const file = new Blob([backupContent], { type: 'application/json' });

    const metadata = {
        name: fileName,
        mimeType: 'application/json',
        appProperties: {
            'isBManagerBackup': 'true' // Custom property to identify our backup files
        }
    };
    
    const form = new FormData();
    form.append('metadata', new Blob([JSON.stringify(metadata)], { type: 'application/json' }));
    form.append('file', file);

    const response = await gapi.client.request({
        path: '/upload/drive/v3/files',
        method: 'POST',
        params: { uploadType: 'multipart' },
        body: form
    });
    
    if (response.status !== 200) {
        console.error('File upload failed:', response);
        throw new Error('File upload failed.');
    }
};

/**
 * Lists backup files from the user's Google Drive.
 */
export const listFiles = async (): Promise<CloudFile[]> => {
    ensureInitialized();
    const response = await gapi.client.drive.files.list({
        q: "appProperties has { key='isBManagerBackup' and value='true' } and trashed=false",
        fields: 'files(id, name, modifiedTime)',
        orderBy: 'modifiedTime desc',
        pageSize: 20
    });
    return (response.result.files as CloudFile[]) || [];
};

/**
 * Downloads a specific backup file by its ID.
 */
export const downloadFile = async (fileId: string): Promise<FullAppBackup> => {
    ensureInitialized();
    const response = await gapi.client.drive.files.get({
        fileId: fileId,
        alt: 'media'
    });
    // The result is the file content, which should be parsed as JSON.
    return response.result as FullAppBackup;
};