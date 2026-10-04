import{f as t}from"./dateFormatter--_xwye2R.js";function m(i,o,n){const r=`mailto:${i}?subject=${encodeURIComponent(o)}&body=${encodeURIComponent(n)}`;window.open(r,"_self")}function c(i,o,n){const r=Object.entries(o).filter(([,a])=>a).map(([a,d])=>`${a}: ${d}`).join(`
`);return`
שלום,

${n}

פרטים:
${r}

זוהי הודעה אוטומטית מאפליקציית B.Manager.
    `.trim()}const u=(i,o,n)=>{if(!n.enableEmailNotifications||!n.notificationEmailAddress||!n.notifyOnNewReport)return;const r=`דוח חדש נוצר: ${i.title}`,a=c("דוח חדש",{בניין:o.name,כותרת:i.title,תאריך:t(i.date)},"דוח חדש נוצר במערכת.");m(n.notificationEmailAddress,r,a)},$=(i,o,n,r)=>{if(!r.enableEmailNotifications||!r.notificationEmailAddress||!r.notifyOnCriticalIssues)return;const a=`התראה על תקלה קריטית: ${n.name}`,d=c("תקלה קריטית חדשה",{בניין:n.name,דוח:o.title,תיאור:i.description,מיקום:i.locationTag},"זוהי התראה על תקלה חדשה שסווגה כקריטית.");m(r.notificationEmailAddress,a,d)},p=(i,o,n)=>{if(!n.enableEmailNotifications||!n.notificationEmailAddress||!n.notifyOnTaskCompletion)return;const r=`משימה הושלמה: ${i.description}`,a=c("משימה הושלמה",{בניין:o.name,משימה:i.description,"תאריך יעד מקורי":i.dueDate?t(i.dueDate):"לא צוין"},"המשימה הבאה סומנה כהושלמה.");m(n.notificationEmailAddress,r,a)},E=(i,o)=>{if(!o.enableEmailNotifications||!o.notificationEmailAddress)return;let n=`שלום,

להלן סיכום התראות מהמערכת:

`,r=!1;const a=[];o.notifyOnFileDueSoon&&i.dueSoonFilesList.length>0&&i.dueSoonFilesList.forEach(e=>a.push(`- קובץ: ${e.name}
  בניין: ${e.projectName}
  תאריך יעד: ${t(e.dueDate)}`)),o.notifyOnTodoDueSoon&&i.dueSoonTodosList.length>0&&i.dueSoonTodosList.forEach(e=>a.push(`- משימה: ${e.name}
  בניין: ${e.projectName}
  תאריך יעד: ${t(e.dueDate)}`)),o.notifyOnPermitDueSoon&&i.dueSoonPermitsList.length>0&&i.dueSoonPermitsList.forEach(e=>a.push(`- היתר: ${e.permitName} (${e.workerName})
  בניין: ${e.projectName}
  תאריך יעד: ${t(e.validUntil)}`)),o.notifyOnWarrantyDueSoon&&i.dueSoonWarrantiesList.length>0&&i.dueSoonWarrantiesList.forEach(e=>a.push(`- אחריות: ${e.itemName}
  בניין: ${e.projectName}
  תאריך יעד: ${t(e.warrantyEndDate)}`)),a.length>0&&(r=!0,n+=`--- פריטים הדורשים טיפול בקרוב ---

`,n+=a.join(`

`),n+=`

`);const d=[];if(o.notifyOnFileExpired&&i.expiredFilesList.length>0&&i.expiredFilesList.forEach(e=>d.push(`- קובץ: ${e.name}
  בניין: ${e.projectName}
  פג תוקף ב: ${t(e.dueDate)}`)),o.notifyOnTodoExpired&&i.expiredTodosList.length>0&&i.expiredTodosList.forEach(e=>d.push(`- משימה: ${e.name}
  בניין: ${e.projectName}
  פג תוקף ב: ${t(e.dueDate)}`)),o.notifyOnPermitExpired&&i.expiredPermitsList.length>0&&i.expiredPermitsList.forEach(e=>d.push(`- היתר: ${e.permitName} (${e.workerName})
  בניין: ${e.projectName}
  פג תוקף ב: ${t(e.validUntil)}`)),o.notifyOnWarrantyExpired&&i.expiredWarrantiesList.length>0&&i.expiredWarrantiesList.forEach(e=>d.push(`- אחריות: ${e.itemName}
  בניין: ${e.projectName}
  פג תוקף ב: ${t(e.warrantyEndDate)}`)),d.length>0&&(r=!0,n+=`--- פריטים שפג תוקפם ---

`,n+=d.join(`

`),n+=`

`),!r)return;n+="זוהי הודעה אוטומטית מאפליקציית B.Manager.";const l=`סיכום התראות B.Manager - ${t(new Date)}`;m(o.notificationEmailAddress,l,n.trim())};export{$ as a,E as b,p as c,u as t};
