export const isMimeTypeViewable = (mimeType: string): boolean => {
    if (!mimeType) return false;
    const viewableTypes = ['image/', 'application/pdf', 'text/'];
    return viewableTypes.some(type => mimeType.startsWith(type));
};
