(function(){
  function flatten(accounts){return accounts.flatMap(a=>(a.providers||[]).map(p=>({...p,email:a.email,accountId:a.id}))); }
  function score(profile,now){
    const remaining=Math.max(0,Math.min(100,Number(profile.remainingPercentage)||0));
    const reset=new Date(profile.resetDate).getTime();
    const hours=Number.isFinite(reset)?(reset-now)/3600000:Infinity;
    // A balanced score favors healthy capacity while giving modest weight to an approaching reset.
    const urgency=Number.isFinite(hours)?Math.max(0,1-Math.max(0,hours)/(24*14)):0;
    return remaining*0.78 + urgency*22;
  }
  function rank(accounts,now=Date.now()){
    return flatten(accounts).filter(p=>Number.isFinite(new Date(p.resetDate).getTime())&&new Date(p.resetDate).getTime()>now&&p.remainingPercentage>0)
      .map(p=>({...p,score:score(p,now)})).sort((a,b)=>b.score-a.score);
  }
  function reason(p,now=Date.now()){
    const hours=(new Date(p.resetDate).getTime()-now)/3600000;
    let timing=hours<24?"resets within 24 hours":hours<72?"resets within 3 days":"has time before its next reset";
    return `${p.remainingPercentage}% remaining and ${timing}.`;
  }
  window.TokenRecommendations={flatten,rank,reason};
})();