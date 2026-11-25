(function(){
  function add(type,title,message,profileId){
    const s=TokenStore.get();const key=[type,profileId||"",new Date().toISOString().slice(0,10)].join(":");
    if(s.notifications.some(n=>n.key===key))return;
    s.notifications.unshift({id:TokenStore.uid("notice"),key,type,title,message,createdAt:new Date().toISOString(),viewed:false});
    s.notifications=s.notifications.slice(0,60);TokenStore.save();
  }
  function evaluate(){
    const s=TokenStore.get(),now=Date.now(),prefs=s.preferences||{};
    s.accounts.forEach(a=>(a.providers||[]).forEach(p=>{
      const reset=new Date(p.resetDate).getTime();
      if(Number.isFinite(reset)&&reset<=now){
        if(p.remainingPercentage<100){
          p.remainingPercentage=100;p.lastResetAt=new Date(now).toISOString();
          if(prefs.notifyReset!==false)add("reset","Tokens reset",`${p.name} for ${a.email} was restored to 100%. Set its next reset date manually.` ,p.id);
        }
        if(prefs.notifyExpired!==false)add("expired","Reset date reached",`${p.name} for ${a.email} needs its next reset date entered.`,p.id);
      }else if(prefs.notifyLow!==false&&p.remainingPercentage<=20){
        add("low","Low token balance",`${p.name} for ${a.email} has ${p.remainingPercentage}% remaining.`,p.id);
      }
    }));
    TokenStore.save();
  }
  window.TokenNotifications={add,evaluate};
})();