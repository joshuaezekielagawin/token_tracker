(function(){
  const $=id=>document.getElementById(id);
  let pendingImportMode="merge";
  const fmtDate=value=>{const d=new Date(value);if(Number.isNaN(d.getTime()))return "Unknown";return d.toLocaleString(undefined,{month:"short",day:"numeric",year:"numeric",hour:"numeric",minute:"2-digit"});};
  const relative=value=>{const ms=new Date(value).getTime()-Date.now();if(!Number.isFinite(ms))return "No reset date";if(ms<=0)return "Reset date passed";const days=Math.floor(ms/86400000),hours=Math.floor(ms%86400000/3600000);if(days>0)return `In ${days}d ${hours}h`;const mins=Math.floor(ms%3600000/60000);return `In ${hours}h ${mins}m`;};
  const esc=value=>String(value??"").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
  const allProfiles=()=>TokenRecommendations.flatten(TokenStore.get().accounts);
  function toast(message,type="success"){const el=document.createElement("div");el.className="toast "+(type==="error"?"error":"");el.textContent=message;$("toastRegion").appendChild(el);setTimeout(()=>el.remove(),3600);}
  function showView(name){document.querySelectorAll(".page").forEach(p=>p.classList.toggle("active",p.id==="view-"+name));document.querySelectorAll(".nav-link").forEach(b=>b.classList.toggle("active",b.dataset.view===name));if(name==="dashboard")renderDashboard();if(name==="accounts")renderAccounts();if(name==="settings")renderSettings();window.scrollTo(0,0);}
  function profileStatus(p){const reset=new Date(p.resetDate).getTime();if(reset<=Date.now())return '<span class="status-pill expired">Reset date passed</span>';if(p.remainingPercentage<=20)return '<span class="status-pill low">Low balance</span>';return p.isActive?'<span class="active-pill">● Active</span>':'<span class="status-pill">Available</span>';}
  function progress(p){const v=Number(p.remainingPercentage),used=100-v,cls=v<=20?"low":v<=45?"medium":"";return `<div class="usage-cell"><div class="usage-top"><strong>${v}% left</strong><span>${used}% used</span></div><div class="progress"><div class="progress-fill ${cls}" style="width:${v}%"></div></div></div>`;}
  function profileRow(a,p,management=false){
    return `<div class="profile-row"><div class="profile-provider"><span class="provider-dot"></span>${esc(p.name)} ${p.isActive?'<span class="active-pill">Active</span>':""}</div>${progress(p)}<div class="reset-cell"><strong>${esc(fmtDate(p.resetDate))}</strong><small>${esc(relative(p.resetDate))}</small></div><div>${profileStatus(p)}</div><div class="row-actions">${management?`<button title="Set active" data-action="activate" data-account="${esc(a.id)}" data-profile="${esc(p.id)}">◎</button>`:""}<button title="Edit profile" data-action="edit-profile" data-account="${esc(a.id)}" data-profile="${esc(p.id)}">✎</button><button title="Delete profile" data-action="delete-profile" data-account="${esc(a.id)}" data-profile="${esc(p.id)}">×</button></div></div>`;
  }
  function groupCard(a,management=false){
    const providers=(a.providers||[]).map(p=>profileRow(a,p,management)).join("");
    return `<article class="email-group ${management?"manage-group":""}"><div class="email-group-header"><div class="email-title"><span class="email-avatar">${esc((a.email||"?").slice(0,1).toUpperCase())}</span><div><strong>${esc(a.email)}</strong><small>${a.providers.length} provider profile${a.providers.length===1?"":"s"}</small></div></div><div class="group-actions">${management?`<button class="small-action" data-action="add-provider" data-account="${esc(a.id)}">＋ Provider</button><button class="small-action" data-action="edit-email" data-account="${esc(a.id)}">Edit email</button><button class="small-action" data-action="delete-account" data-account="${esc(a.id)}">Delete</button>`:""}</div></div>${providers||'<div class="empty-state">No provider profiles yet.</div>'}</article>`;
  }
  function renderSummary(){
    const s=TokenStore.get(),profiles=allProfiles();$("summaryAccounts").textContent=s.accounts.length;$("summaryProfiles").textContent=profiles.length;$("summaryActive").textContent=profiles.filter(p=>p.isActive).length;$("summaryLow").textContent=profiles.filter(p=>p.remainingPercentage<=20).length;
  }
  function renderRecommendation(){
    const prefs=TokenStore.get().preferences||{};const el=$("recommendationContent");
    if(prefs.notifyRecommend===false){el.innerHTML='<div class="empty-inline"><span class="empty-icon">✧</span><div><strong>Recommendations are disabled</strong><p>Enable them in Settings to see a suggested account.</p></div></div>';return;}
    const best=TokenRecommendations.rank(TokenStore.get().accounts)[0];
    if(!best){el.innerHTML='<div class="empty-inline"><span class="empty-icon">✧</span><div><strong>No available profiles to recommend</strong><p>Add a provider profile with remaining capacity and a future reset date.</p></div></div>';return;}
    el.innerHTML=`<div class="recommendation-main"><div class="recommended-identity"><span class="provider-mark">${esc(best.name.slice(0,1).toUpperCase())}</span><div><strong>${esc(best.name)} <span style="color:#bcb3ff;font-weight:400">· ${esc(best.email)}</span></strong><small>Suggested provider profile</small></div></div><div class="recommendation-stats"><div class="recommendation-stat"><strong>${best.remainingPercentage}%</strong><small>REMAINING</small></div><div class="recommendation-stat"><strong>${esc(relative(best.resetDate))}</strong><small>NEXT RESET</small></div><button class="btn btn-primary" data-action="confirm-recommend" data-account="${esc(best.accountId)}" data-profile="${esc(best.id)}">Use this profile</button></div></div><p class="recommendation-reason">Why this profile? ${esc(TokenRecommendations.reason(best))} Recommendation balances remaining capacity with reset proximity.</p>`;
  }
  function notificationMarkup(n,compact=false){
    const symbol=n.type==="reset"?"↻":n.type==="low"?"!":n.type==="expired"?"◷":"✧";
    return `<article class="notification-item ${n.viewed?"is-viewed":"is-unread"} ${compact?"compact":""}"><span class="notification-symbol">${symbol}</span><div class="notification-copy"><strong>${esc(n.title)}</strong><p>${esc(n.message)}</p><small>${esc(new Date(n.createdAt).toLocaleString())}</small></div>${!n.viewed?`<button class="notification-mark" data-notice-action="view" data-notice-id="${esc(n.id)}" aria-label="Mark ${esc(n.title)} as viewed" title="Mark viewed">✓</button>`:""}</article>`;
  }
  function renderNotifications(){
    const list=TokenStore.get().notifications||[],el=$("notificationList"),unread=list.filter(n=>!n.viewed).length;
    if(el)el.innerHTML=list.length?list.slice(0,8).map(n=>notificationMarkup(n)).join(""):'<div class="empty-state"><div class="empty-art">♧</div><h3>All quiet for now</h3><p>Reset and balance notifications will appear here.</p></div>';
    const count=$("notificationCount"),summary=$("notificationSummary"),popoverList=$("notificationPopoverList");
    if(count){count.textContent=unread>99?"99+":String(unread);count.hidden=unread===0;}
    if(summary)summary.textContent=unread?`${unread} unread notification${unread===1?"":"s"}`:"You're all caught up.";
    if(popoverList)popoverList.innerHTML=list.length?list.slice(0,8).map(n=>notificationMarkup(n,true)).join(""):'<div class="notification-empty">No notifications yet.</div>';
  }
  function markNotificationViewed(id){const s=TokenStore.get();const n=s.notifications.find(x=>x.id===id);if(n)n.viewed=true;TokenStore.save();renderNotifications();}
  function closeNotificationPopover(){const panel=$("notificationPopover"),button=$("notificationToggle");if(panel)panel.hidden=true;if(button)button.setAttribute("aria-expanded","false");}
  function renderDashboard(){
    const accounts=TokenStore.get().accounts,profiles=allProfiles();
    const active=profiles.filter(p=>p.isActive);
    $("activeUsageList").innerHTML=active.length?active.map(p=>{
      const a=accounts.find(x=>x.id===p.accountId);
      const left=Number(p.remainingPercentage),used=100-left,cls=left<=20?"low":left<=45?"medium":"";
      return `<article class="active-usage-item"><div class="active-identity"><span class="provider-mark">${esc(p.name.slice(0,1).toUpperCase())}</span><div><strong>${esc(a?.email||"Unknown email")}</strong><span>${esc(p.name)} <span class="active-pill">Active</span></span></div></div><div class="active-balance"><div class="balance-line"><strong>${left}% <small>remaining</small></strong><span>${used}% used</span></div><div class="progress usage-progress"><div class="progress-fill ${cls}" style="width:${left}%"></div></div></div><button class="btn btn-primary update-usage-btn" data-action="update-usage" data-account="${esc(p.accountId)}" data-profile="${esc(p.id)}">Update usage</button></article>`;
    }).join(""):'<div class="empty-inline"><span class="empty-icon">◎</span><div><strong>No active provider selected</strong><p>Choose an active provider in Manage accounts to show what you are currently using.</p><button class="btn btn-secondary" data-goto="accounts">Manage accounts</button></div></div>';
    const now=Date.now(),resets=profiles.map(p=>({...p,account:accounts.find(a=>a.id===p.accountId),delta:new Date(p.resetDate).getTime()-now})).filter(p=>Number.isFinite(p.delta)).sort((a,b)=>a.delta-b.delta).slice(0,5);
    $("upcomingResets").innerHTML=resets.length?resets.map(p=>{
      const urgent=p.delta<=86400000,passed=p.delta<=0;
      return `<div class="reset-item ${passed?"is-expired":urgent?"is-soon":""}"><div class="reset-item-main"><strong>${esc(p.name)}</strong><span>${esc(p.account?.email||"Unknown email")}</span></div><div class="reset-item-time"><strong>${esc(relative(p.resetDate))}</strong><small>${esc(fmtDate(p.resetDate))}</small></div><span class="reset-flag">${passed?"PAST DUE":urgent?"RESET SOON":"SCHEDULED"}</span></div>`;
    }).join(""):'<div class="empty-state"><h3>No reset dates yet</h3><p>Add provider profiles with their next reset date to track upcoming resets.</p></div>';
    renderNotifications();
  }
  function renderAccounts(){
    const q=$("accountSearch").value.trim().toLowerCase();const accounts=TokenStore.get().accounts.map(a=>({...a,providers:a.providers.filter(p=>a.email.toLowerCase().includes(q)||p.name.toLowerCase().includes(q))})).filter(a=>a.providers.length);
    $("accountCount").textContent=allProfiles().length+" provider profiles";
    $("manageAccounts").innerHTML=accounts.length?accounts.map(a=>groupCard(a,true)).join(""):'<div class="empty-state"><div class="empty-art">⌕</div><h3>No matching accounts</h3><p>Try another search, or add a new email account.</p><button class="btn btn-primary" data-action="new-account">＋ Add account</button></div>';
  }
  function renderSettings(){
    const p=TokenStore.get().preferences;$("themeSelect").value=p.theme||"dark";$("notifyReset").checked=p.notifyReset!==false;$("notifyLow").checked=p.notifyLow!==false;$("notifyRecommend").checked=p.notifyRecommend!==false;$("notifyExpired").checked=p.notifyExpired!==false;
  }
  function openModal(accountId=null,profileId=null){
    $("accountForm").reset();$("editAccountId").value=accountId||"";$("editProfileId").value=profileId||"";$("remainingInput").value=100;$("activeInput").checked=false;
    const a=accountId?TokenStore.get().accounts.find(x=>x.id===accountId):null;const p=a&&profileId?a.providers.find(x=>x.id===profileId):null;
    $("modalTitle").textContent=p?"Edit provider profile":a?"Add provider profile":"Add email account";$("modalEyebrow").textContent=p?"EDIT PROFILE":"ACCOUNT MANAGEMENT";
    $("emailName").value=a?a.email:"";$("emailName").disabled=!!a;$("providerName").value=p?p.name:"";$("remainingInput").value=p?p.remainingPercentage:100;$("resetInput").value=p?toLocalInput(p.resetDate):"";$("activeInput").checked=p?!!p.isActive:false;
    $("usedPreview").textContent=(100-Number($("remainingInput").value))+"% used";$("modalBackdrop").hidden=false;$("providerName").focus();
  }
  function toLocalInput(value){const d=new Date(value);if(Number.isNaN(d.getTime()))return "";const local=new Date(d.getTime()-d.getTimezoneOffset()*60000);return local.toISOString().slice(0,16);}
  function closeModal(){$("modalBackdrop").hidden=true;$("emailName").disabled=false;}
  function saveProfile(e){
    e.preventDefault();const s=TokenStore.get(),accountId=$("editAccountId").value,profileId=$("editProfileId").value,email=$("emailName").value.trim(),name=$("providerName").value.trim(),remaining=Number($("remainingInput").value),reset=$("resetInput").value;
    if(!name||!reset||!Number.isFinite(remaining)||remaining<0||remaining>100){toast("Enter a provider, valid reset date, and percentage from 0 to 100.","error");return;}
    let account=accountId?s.accounts.find(a=>a.id===accountId):s.accounts.find(a=>a.email.toLowerCase()===email.toLowerCase());
    if(!account){account={id:TokenStore.uid("account"),email,providers:[]};s.accounts.push(account);}
    if(profileId){
      const p=account.providers.find(x=>x.id===profileId);if(!p)return;
      p.name=name;p.remainingPercentage=remaining;p.resetDate=new Date(reset).toISOString();p.isActive=$("activeInput").checked;
    }else{
      if(account.providers.some(p=>p.name.toLowerCase()===name.toLowerCase())){toast("That provider already exists under this email.","error");return;}
      account.providers.push({id:TokenStore.uid("profile"),name,remainingPercentage:remaining,resetDate:new Date(reset).toISOString(),isActive:$("activeInput").checked,lastResetAt:null});
    }
    if($("activeInput").checked){account.providers.forEach(p=>{if(p.id!==(profileId||account.providers[account.providers.length-1].id))p.isActive=false;});}
    TokenStore.save();closeModal();renderAll();toast(profileId?"Provider profile updated.":"Provider profile saved.");
  }
  function confirmActive(accountId,profileId){
    const s=TokenStore.get(),a=s.accounts.find(x=>x.id===accountId),p=a&&a.providers.find(x=>x.id===profileId);if(!p)return;
    if(!confirm(`Mark ${p.name} (${a.email}) as active for this provider?`))return;
    // Active state is per provider name; multiple different providers can be active simultaneously.
    s.accounts.forEach(acc=>acc.providers.forEach(other=>{if(other.name.toLowerCase()===p.name.toLowerCase())other.isActive=false;}));p.isActive=true;TokenStore.save();renderAll();toast(`${p.name} marked active.`);
  }
  function handleAction(e){
    const b=e.target.closest("[data-action]");if(!b)return;const {action,account,profile}=b.dataset,s=TokenStore.get(),a=s.accounts.find(x=>x.id===account);
    if(action==="new-account"){openModal();return;}
    if(action==="add-provider"){openModal(account);return;}
    if(action==="edit-profile"){openModal(account,profile);return;}
    if(action==="edit-email"){if(!a)return;const next=prompt("Edit email address or account label:",a.email);if(next&&next.trim()){a.email=next.trim();TokenStore.save();renderAll();toast("Email updated.");}return;}
    if(action==="delete-account"){if(!a)return;if(confirm(`Delete ${a.email} and all ${a.providers.length} provider profile(s)? This cannot be undone.`)){s.accounts=s.accounts.filter(x=>x.id!==account);TokenStore.save();renderAll();toast("Account deleted.");}return;}
    if(action==="delete-profile"){if(!a)return;const p=a.providers.find(x=>x.id===profile);if(p&&confirm(`Delete ${p.name} from ${a.email}?`)){a.providers=a.providers.filter(x=>x.id!==profile);if(!a.providers.length)s.accounts=s.accounts.filter(x=>x.id!==account);TokenStore.save();renderAll();toast("Provider profile deleted.");}return;}
    if(action==="update-usage"){
      if(!a)return;const p=a.providers.find(x=>x.id===profile);if(!p)return;
      const value=prompt(`Update remaining token percentage for ${p.name} (${a.email}). Enter a value from 0 to 100:`,String(p.remainingPercentage));
      if(value===null)return;const remaining=Number(value);
      if(value.trim()===""||!Number.isFinite(remaining)||remaining<0||remaining>100){toast("Enter a percentage from 0 to 100.","error");return;}
      p.remainingPercentage=Math.round(remaining);TokenStore.save();renderAll();toast("Token usage updated.");return;
    }
    if(action==="activate"||action==="confirm-recommend"){confirmActive(account,profile);return;}
  }
  function renderAll(){renderDashboard();renderAccounts();if($("view-settings").classList.contains("active"))renderSettings();}
  const BACKUP_DB="token-tracker-file-access",BACKUP_STORE="handles";
  function openBackupDB(){return new Promise((resolve,reject)=>{const request=indexedDB.open(BACKUP_DB,1);request.onupgradeneeded=()=>request.result.createObjectStore(BACKUP_STORE);request.onsuccess=()=>resolve(request.result);request.onerror=()=>reject(request.error);});}
  async function saveBackupRoot(handle){const db=await openBackupDB();return new Promise((resolve,reject)=>{const tx=db.transaction(BACKUP_STORE,"readwrite");tx.objectStore(BACKUP_STORE).put(handle,"projectRoot");tx.oncomplete=()=>{db.close();resolve();};tx.onerror=()=>{db.close();reject(tx.error);};});}
  async function getBackupRoot(){if(!("indexedDB" in window))return null;try{const db=await openBackupDB();return await new Promise((resolve,reject)=>{const tx=db.transaction(BACKUP_STORE,"readonly"),req=tx.objectStore(BACKUP_STORE).get("projectRoot");req.onsuccess=()=>{db.close();resolve(req.result||null);};req.onerror=()=>{db.close();reject(req.error);};});}catch(_){return null;}}
  async function getBackupFolder(promptForFolder=false){
    if(!window.showDirectoryPicker)return null;
    let root=await getBackupRoot();
    if(!root&&promptForFolder){root=await window.showDirectoryPicker({id:"token-tracker-project",mode:"readwrite"});await saveBackupRoot(root);}
    if(!root)return null;
    let permission=await root.queryPermission({mode:"readwrite"});
    if(permission!=="granted"&&promptForFolder)permission=await root.requestPermission({mode:"readwrite"});
    if(permission!=="granted")return null;
    return await root.getDirectoryHandle("backup",{create:true});
  }
  async function refreshBackupFolderStatus(){const el=$("backupFolderStatus");if(!el)return;const root=await getBackupRoot();el.textContent=root?`Project folder selected: ${root.name}/backup`:"Not configured. Select your project folder; Token Tracker will create and use its backup subfolder.";}
  async function chooseBackupFolder(){
    if(!window.showDirectoryPicker){toast("Folder access is not supported in this browser. Use the standard JSON download and file picker.","error");return;}
    try{const root=await window.showDirectoryPicker({id:"token-tracker-project",mode:"readwrite"});await saveBackupRoot(root);await root.getDirectoryHandle("backup",{create:true});await refreshBackupFolderStatus();toast(`Backup folder ready: ${root.name}/backup`);}
    catch(err){if(err.name!=="AbortError")toast("Could not set the backup folder: "+err.message,"error");}
  }
  async function exportJSON(){
    const filename="token-tracker-backup-"+new Date().toISOString().replace(/[:.]/g,"-").slice(0,19)+".json",data=TokenStore.exportData();
    try{
      const folder=await getBackupFolder(true);
      if(folder){const file=await folder.getFileHandle(filename,{create:true}),w=await file.createWritable();await w.write(new Blob([data],{type:"application/json"}));await w.close();TokenStore.get().preferences.lastBackupReminder=Date.now();TokenStore.save();toast(`Backup saved to backup/${filename}`);return;}
    }catch(err){if(err.name==="AbortError")return;toast("Could not write to backup folder. Using browser download instead.","error");}
    const blob=new Blob([data],{type:"application/json"}),url=URL.createObjectURL(blob),a=document.createElement("a");a.href=url;a.download=filename;document.body.appendChild(a);a.click();a.remove();URL.revokeObjectURL(url);TokenStore.get().preferences.lastBackupReminder=Date.now();TokenStore.save();toast("JSON backup downloaded. Choose a backup folder in Settings to save directly there.");
  }
  function openImport(){ $("importBackdrop").hidden=false; }
  function closeImport(){ $("importBackdrop").hidden=true; }
  async function chooseImportFile(){
    try{
      if(window.showDirectoryPicker&&!(await getBackupRoot())){await chooseBackupFolder();toast("Backup folder configured. Select Import JSON again to choose a backup file.");return;}
      const folder=await getBackupFolder(true);
      if(folder&&window.showOpenFilePicker){const [handle]=await window.showOpenFilePicker({startIn:folder,types:[{description:"JSON backup",accept:{"application/json":[".json"]}}],multiple:false});const file=await handle.getFile();doImport(file,pendingImportMode);return;}
    }catch(err){if(err.name==="AbortError")return;toast("Could not open the backup folder: "+err.message,"error");return;}
    $("jsonFileInput").click();
  }
  function doImport(file,mode){
    const reader=new FileReader();reader.onload=()=>{
      try{
        const incoming=TokenStore.normalizeImport(JSON.parse(reader.result));const current=TokenStore.get();
        if(mode==="replace"){if(!confirm("Replace all current accounts and preferences with this backup?"))return;TokenStore.set(incoming);}
        else{
          const merged=TokenStore.get(),byEmail=new Map(merged.accounts.map(a=>[a.email.toLowerCase(),a]));
          incoming.accounts.forEach(inc=>{let target=byEmail.get(inc.email.toLowerCase());if(!target){target={...inc,providers:[]};merged.accounts.push(target);byEmail.set(inc.email.toLowerCase(),target);}
            inc.providers.forEach(ip=>{const existing=target.providers.find(p=>p.name.toLowerCase()===ip.name.toLowerCase());if(existing)Object.assign(existing,ip,{id:existing.id});else target.providers.push(ip);});
          });
          merged.preferences={...merged.preferences,...incoming.preferences};TokenStore.set(merged);
        }
        closeImport();renderAll();toast("Backup imported successfully.");
      }catch(err){toast("Import failed: "+err.message,"error");}
      $("jsonFileInput").value="";
    };reader.onerror=()=>toast("Could not read the selected file.","error");reader.readAsText(file);
  }
  function resetData(){if(!confirm("Delete all Token Tracker data stored in this browser? Export a backup first if you may need it."))return;if(!confirm("This permanently removes all tracked accounts. Continue?"))return;TokenStore.set({...TokenStore.DEFAULTS,preferences:{...TokenStore.DEFAULTS.preferences,theme:TokenStore.get().preferences.theme}});renderAll();toast("Application data reset.");}
  function init(){
    const s=TokenStore.get();document.body.classList.toggle("light",s.preferences.theme==="light");TokenNotifications.evaluate();renderAll();
    document.querySelectorAll(".nav-link").forEach(b=>b.addEventListener("click",()=>showView(b.dataset.view)));
    document.querySelectorAll("[data-goto]").forEach(b=>b.addEventListener("click",()=>showView(b.dataset.goto)));
    $("addAccountTop").onclick=$("addAccountPage").onclick=()=>openModal();$("closeModal").onclick=$("cancelModal").onclick=closeModal;$("accountForm").onsubmit=saveProfile;
    $("remainingInput").addEventListener("input",()=>{$("usedPreview").textContent=(100-Number($("remainingInput").value||0))+"% used";});
    $("accountSearch").addEventListener("input",renderAccounts);document.addEventListener("click",handleAction);
    $("themeToggle").onclick=()=>{const p=TokenStore.get().preferences;p.theme=p.theme==="dark"?"light":"dark";TokenStore.save();document.body.classList.toggle("light",p.theme==="light");renderSettings();};
    $("themeSelect").onchange=e=>{TokenStore.get().preferences.theme=e.target.value;TokenStore.save();document.body.classList.toggle("light",e.target.value==="light");};
    [["notifyReset","notifyReset"],["notifyLow","notifyLow"],["notifyRecommend","notifyRecommend"],["notifyExpired","notifyExpired"]].forEach(([id,key])=>$(id).onchange=e=>{TokenStore.get().preferences[key]=e.target.checked;TokenStore.save();renderDashboard();});
    $("exportSettings").onclick=exportJSON;$("importSettings").onclick=openImport;$("closeImport").onclick=$("cancelImport").onclick=closeImport;$("chooseBackupFolder").onclick=chooseBackupFolder;refreshBackupFolderStatus();
    $("notificationToggle").onclick=()=>{const panel=$("notificationPopover"),opening=panel.hidden;panel.hidden=!opening;$("notificationToggle").setAttribute("aria-expanded",String(opening));if(opening)renderNotifications();};
    $("markAllViewed").onclick=()=>{TokenStore.get().notifications.forEach(n=>n.viewed=true);TokenStore.save();renderNotifications();};
    $("viewAllNotifications").onclick=()=>{closeNotificationPopover();showView("dashboard");$("view-dashboard").scrollIntoView({behavior:"smooth"});};
    document.addEventListener("click",e=>{const mark=e.target.closest("[data-notice-action='view']");if(mark){markNotificationViewed(mark.dataset.noticeId);return;}if(!e.target.closest(".notification-menu-wrap"))closeNotificationPopover();});
    $("confirmImport").onclick=()=>{pendingImportMode=document.querySelector('input[name="importMode"]:checked').value;closeImport();chooseImportFile();};
    $("jsonFileInput").onchange=e=>{if(e.target.files[0])doImport(e.target.files[0],pendingImportMode);};
    $("resetApp").onclick=resetData;$("clearNotifications").onclick=()=>{const s=TokenStore.get();s.notifications=s.notifications.filter(n=>!n.viewed);TokenStore.save();renderNotifications();toast("Viewed notifications cleared.");};
    $("modalBackdrop").addEventListener("click",e=>{if(e.target===$("modalBackdrop"))closeModal();});$("importBackdrop").addEventListener("click",e=>{if(e.target===$("importBackdrop"))closeImport();});
    // Reset checks are repeated on return to the foreground; no background task is claimed.
    document.addEventListener("visibilitychange",()=>{if(!document.hidden){TokenNotifications.evaluate();renderAll();}});
    window.addEventListener("focus",()=>{TokenNotifications.evaluate();renderAll();});
    const reminder=s.preferences.lastBackupReminder||0;if(Date.now()-reminder>7*86400000&&allProfiles().length){setTimeout(()=>toast("Backup reminder: export a JSON copy of your account data from Settings."),1200);}
  }
  document.addEventListener("DOMContentLoaded",init);
})();