(function(){
  const KEY = "tokenTrackerData";
  const DEFAULTS = {version:1,accounts:[],notifications:[],preferences:{theme:"dark",notifyReset:true,notifyLow:true,notifyRecommend:true,notifyExpired:true,lastBackupReminder:0}};
  function clone(obj){return JSON.parse(JSON.stringify(obj));}
  function load(){
    try{
      const raw=localStorage.getItem(KEY);
      if(!raw)return clone(DEFAULTS);
      const data=JSON.parse(raw);
      if(!data||!Array.isArray(data.accounts))throw new Error("Invalid saved data");
      return {...clone(DEFAULTS),...data,preferences:{...DEFAULTS.preferences,...(data.preferences||{})},notifications:Array.isArray(data.notifications)?data.notifications:[]};
    }catch(e){console.error("Could not load Token Tracker data:",e);return clone(DEFAULTS);}
  }
  let state=load();
  function save(){try{localStorage.setItem(KEY,JSON.stringify(state));return true;}catch(e){console.error(e);return false;}}
  function get(){return state;}
  function set(next){state=next;return save();}
  function update(mutator){mutator(state);return save();}
  function normalizeImport(input){
    if(!input||typeof input!=="object"||!Array.isArray(input.accounts))throw new Error("The JSON file must contain an accounts array.");
    const accounts=input.accounts.map(a=>{
      if(!a||typeof a.email!=="string"||!Array.isArray(a.providers))throw new Error("Each account needs an email and providers array.");
      return {id:String(a.id||uid("account")),email:a.email.trim(),providers:a.providers.map(p=>{
        if(!p||typeof p.name!=="string")throw new Error("Each provider profile needs a name.");
        const remaining=Number(p.remainingPercentage);
        if(!Number.isFinite(remaining)||remaining<0||remaining>100)throw new Error("Remaining percentages must be between 0 and 100.");
        const date=new Date(p.resetDate);
        if(!p.resetDate||Number.isNaN(date.getTime()))throw new Error("Every profile needs a valid reset date.");
        return {id:String(p.id||uid("profile")),name:p.name.trim(),remainingPercentage:remaining,resetDate:date.toISOString(),isActive:!!p.isActive,lastResetAt:p.lastResetAt||null};
      })};
    });
    return {version:1,accounts,preferences:{...DEFAULTS.preferences,...(input.preferences||{})},notifications:Array.isArray(input.notifications)?input.notifications:[]};
  }
  function uid(prefix){return prefix+"-"+Date.now().toString(36)+"-"+Math.random().toString(36).slice(2,9);}
  window.TokenStore={KEY,DEFAULTS,get,set,save,update,uid,normalizeImport,exportData:()=>JSON.stringify(state,null,2)};
})();