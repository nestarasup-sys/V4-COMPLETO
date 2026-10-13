(function (root) {
  "use strict";
  var WIDTH = 1122, HEIGHT = 1402, SLOT_COUNT = 16;
  // Traçados vetoriais extraídos da folha chibi verde fornecida pelo autor.
  // Cada contorno é uma peça distinta, preservando proporções originais.
  var PATHS = {
    head: "M499,44 469,61 450,79 435,99 424,120 415,157 415,187 422,218 411,223 403,235 404,250 410,261 425,275 436,278 447,275 464,287 498,303 531,313 564,318 597,318 617,314 645,304 677,287 694,268 696,231 713,185 713,162 710,145 702,121 688,97 670,75 649,57 609,40 576,33 545,33 Z",
    armLU: "M332,310 316,312 299,322 285,339 273,365 241,461 246,479 263,493 273,496 290,494 302,479 324,432 335,400 339,375 348,366 353,347 348,324 Z",
    armRU: "M789,310 777,319 769,336 771,361 782,375 792,418 820,480 827,490 834,495 856,494 874,481 880,468 877,447 846,359 831,331 814,316 799,310 Z",
    torso: "M535,341 524,369 489,393 478,414 477,439 482,463 510,531 513,552 500,577 473,615 467,630 467,639 508,656 560,665 614,664 667,651 675,647 675,633 666,605 645,557 643,545 655,499 671,473 673,453 670,440 666,433 629,401 611,381 603,366 597,342 Z",
    armLL: "M242,509 225,508 211,524 194,558 160,646 136,693 134,712 138,724 148,735 161,740 177,758 183,758 188,754 192,739 205,727 213,714 216,667 255,593 271,554 273,534 270,527 256,515 Z",
    armRL: "M883,508 864,516 851,528 848,535 849,549 872,605 905,666 908,713 919,730 929,738 933,753 938,758 944,758 959,741 970,737 981,727 987,714 986,696 982,683 962,648 928,560 912,527 900,510 894,507 Z",
    legLU: "M448,676 440,679 430,692 420,713 409,747 390,845 386,879 386,906 388,915 395,925 412,936 432,942 462,943 477,940 492,933 499,923 506,892 532,813 537,784 538,755 534,734 524,717 506,698 477,680 463,676 Z",
    legRU: "M691,679 662,687 641,697 612,719 605,729 605,735 609,741 615,744 615,783 620,818 653,925 663,935 676,940 691,943 717,943 746,934 760,922 765,909 765,889 743,760 731,711 714,682 705,679 Z",
    legLL: "M455,964 418,965 406,968 398,974 362,1100 352,1168 349,1265 354,1328 361,1344 376,1359 393,1367 417,1371 448,1368 462,1359 467,1347 464,1327 456,1310 450,1286 450,1253 462,1177 493,1039 497,1008 497,983 491,974 483,970 Z",
    legRL: "M664,970 656,974 650,984 649,1009 653,1068 659,1101 683,1194 691,1245 715,1316 730,1346 743,1359 754,1365 768,1369 793,1370 820,1364 835,1353 840,1336 837,1325 819,1299 810,1281 786,1203 775,1140 761,1016 752,979 743,969 720,964 691,964 Z"
  };
  var PARTS = [
    {id:"torso", name:"Tronco", parent:null, pivot:[559,475], base:[0,0]},
    {id:"head", name:"Cabeça", parent:"torso", pivot:[559,318], base:[0,18]},
    {id:"armLU", name:"Braço superior E", parent:"torso", pivot:[335,332], base:[135,58]},
    {id:"armLL", name:"Antebraço E", parent:"armLU", pivot:[257,513], base:[0,-8]},
    {id:"armRU", name:"Braço superior D", parent:"torso", pivot:[791,332], base:[-135,58]},
    {id:"armRL", name:"Antebraço D", parent:"armRU", pivot:[875,513], base:[0,-8]},
    {id:"legLU", name:"Coxa E", parent:"torso", pivot:[461,686], base:[18,-15]},
    {id:"legLL", name:"Canela E", parent:"legLU", pivot:[438,960], base:[5,-22]},
    {id:"legRU", name:"Coxa D", parent:"torso", pivot:[682,686], base:[-17,-15]},
    {id:"legRL", name:"Canela D", parent:"legRU", pivot:[700,960], base:[-5,-22]}
  ];
  var BY_ID = Object.fromEntries(PARTS.map(function(p){ return [p.id,p]; }));
  var DRAW_ORDER=["legLL","legRL","legLU","legRU","armLU","armRU","armLL","armRL","torso","head"];
  var PRESETS = {
    neutra: { },
    aceno: {armRU:-55,armRL:-65,armLU:9,armLL:11,head:-8},
    corrida: {armLU:37,armLL:40,armRU:-38,armRL:-30,legLU:23,legLL:-27,legRU:-24,legRL:37,torso:6},
    sentada: {legLU:-68,legRU:66,legLL:80,legRL:-65,armLU:-14,armRU:14,head:8},
    danca: {armLU:-52,armLL:-27,armRU:46,armRL:25,legLU:15,legRU:-12,head:12,torso:-7}
  };
  function clamp(n,min,max){return Math.min(max,Math.max(min,n));}
  function sane(n,lo,hi,def){var v=Number(n);return Number.isFinite(v)?clamp(v,lo,hi):def;}
  function freshPose(){
    var pose={};PARTS.forEach(function(p){pose[p.id]={x:p.base[0],y:p.base[1],rotation:0};});return pose;
  }
  function copyPose(pose){return JSON.parse(JSON.stringify(pose));}
  function newPoseEntry(name,pose){return {id:"pose-"+Date.now()+"-"+Math.random().toString(36).slice(2,7),name:String(name).slice(0,50),pose:copyPose(pose)};}
  function makeCharacter(index){
    return {id:"person-"+Date.now()+"-"+Math.random().toString(36).slice(2,7),
      name:"Personagem "+String(index+1).padStart(2,"0"),skin:"#f9eadd",
      pose:freshPose(), workingPose:freshPose(), savedPoses:[], mirrored:false};
  }
  function freshProject(){
    var slots=Array(SLOT_COUNT).fill(null);slots[0]=makeCharacter(0);
    return {format:"gacha-body-v1",version:1,slots:slots};
  }
  function safeCharacter(obj,index){
    if(!obj||typeof obj!=="object")return null;
    var p=freshPose(), input=obj.pose&&typeof obj.pose==="object"?obj.pose:{};
    PARTS.forEach(function(piece){
      var q=input[piece.id]||{};
      p[piece.id]={x:sane(q.x,-600,600,p[piece.id].x),y:sane(q.y,-600,600,p[piece.id].y),rotation:sane(q.rotation,-180,180,0)};
    });
    var work={pose:input};
    if(obj.workingPose && typeof obj.workingPose==="object") work.pose=obj.workingPose;
    var w=freshPose();PARTS.forEach(function(piece){var q=work.pose[piece.id]||{};w[piece.id]={x:sane(q.x,-600,600,p[piece.id].x),y:sane(q.y,-600,600,p[piece.id].y),rotation:sane(q.rotation,-180,180,p[piece.id].rotation)};});
    var entries=Array.isArray(obj.savedPoses)?obj.savedPoses.slice(0,40):[];
    var savedPoses=entries.filter(function(v){return v&&typeof v==="object"&&v.pose;}).map(function(v,i){
      var po=freshPose();PARTS.forEach(function(part){var q=v.pose[part.id]||{};po[part.id]={x:sane(q.x,-600,600,part.base[0]),y:sane(q.y,-600,600,part.base[1]),rotation:sane(q.rotation,-180,180,0)};});
      return {id:String(v.id||("saved-"+i)).slice(0,80),name:String(v.name||("Pose "+(i+1))).slice(0,50),pose:po};
    });
    var color=typeof obj.skin==="string"&&/^#[0-9a-f]{6}$/i.test(obj.skin)?obj.skin:"#f9eadd";
    return {id:String(obj.id||("slot-"+index)).slice(0,100),
      name:String(obj.name||("Personagem "+(index+1))).slice(0,60),
      skin:color,pose:p,workingPose:w,savedPoses:savedPoses,mirrored:!!obj.mirrored};
  }
  function normalize(raw){
    if(!raw||raw.format!=="gacha-body-v1"||raw.version!==1||!Array.isArray(raw.slots)||raw.slots.length!==SLOT_COUNT)
      throw new Error("Formato inválido. Esperado gacha-body-v1 com 16 slots.");
    return {format:"gacha-body-v1",version:1,slots:raw.slots.map(safeCharacter)};
  }
  function rotation(a){var c=Math.cos(a*Math.PI/180),s=Math.sin(a*Math.PI/180);return [c,s,-s,c,0,0];}
  function mul(m,n){return [m[0]*n[0]+m[2]*n[1],m[1]*n[0]+m[3]*n[1],
    m[0]*n[2]+m[2]*n[3],m[1]*n[2]+m[3]*n[3],
    m[0]*n[4]+m[2]*n[5]+m[4],m[1]*n[4]+m[3]*n[5]+m[5]];}
  function tr(x,y){return [1,0,0,1,x,y];}
  function point(m,p){return [m[0]*p[0]+m[2]*p[1]+m[4],m[1]*p[0]+m[3]*p[1]+m[5]];}
  var I=[1,0,0,1,0,0];
  function transforms(character){
    var pose=character.pose,memo={};
    function resolve(id){
      if(memo[id])return memo[id];
      var p=BY_ID[id],v=pose[id]||{},x=v.x||0,y=v.y||0,r=v.rotation||0;
      var own=mul(tr(x+p.pivot[0],y+p.pivot[1]),mul(rotation(r),tr(-p.pivot[0],-p.pivot[1])));
      memo[id]=mul(p.parent?resolve(p.parent):I,own);return memo[id];
    }
    PARTS.forEach(function(p){resolve(p.id);});return memo;
  }
  function esc(value){return String(value).replace(/[&<>"']/g,function(c){return {"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c];});}
  function renderSVG(character,options){
    options=options||{};
    if(!character)return '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1122 1995"></svg>';
    var preview=!!options.preview,editor=!!options.editor;
    var h=preview?1616:HEIGHT,yShift=preview?115:0;
    var m=transforms(character);
    var rootTransform=(character.mirrored?"translate(1122 0) scale(-1 1) ":"")+"translate(0 "+yShift+")";
    var svg='<svg xmlns="http://www.w3.org/2000/svg" viewBox="'+(preview?'107 0 909 1616':'0 0 '+WIDTH+' '+h)+'" preserveAspectRatio="xMidYMid meet" role="img" aria-label="Corpo chibi articulado">';
    svg+='<defs><linearGradient id="skinShade" x1="0" y1="0" x2="1" y2=".55"><stop stop-color="#ffffff" stop-opacity=".43"/><stop offset=".68" stop-color="#ffffff" stop-opacity="0"/><stop offset="1" stop-color="#8c4f38" stop-opacity=".13"/></linearGradient></defs>';
    if(editor&&options.grid){
      svg+='<defs><pattern id="grid" width="56" height="56" patternUnits="userSpaceOnUse"><path d="M56 0H0V56" fill="none" stroke="#bcb5d8" stroke-opacity=".24" stroke-width="2"/></pattern></defs><rect width="1122" height="1402" fill="url(#grid)"/>';
    }
    svg+='<g transform="'+rootTransform+'">';
    DRAW_ORDER.forEach(function(id){
      var matrix=m[id].map(function(v){return +v.toFixed(5);}).join(" ");
      svg+='<g data-part="'+id+'" transform="matrix('+matrix+')"><path data-part="'+id+'" d="'+PATHS[id]+'" fill="'+character.skin+'" stroke="#793936" stroke-width="4.5" stroke-linejoin="round"/><path data-part="'+id+'" d="'+PATHS[id]+'" fill="url(#skinShade)" pointer-events="none"/></g>';
    });
    // O detalhe da orelha pertence à cabeça e acompanha seu rig.
    svg+='<g transform="matrix('+m.head.map(function(v){return +v.toFixed(5);}).join(" ")+')"><path d="M415 230 Q431 222 432 246 Q434 260 425 256" stroke="#793936" stroke-width="4" fill="none" pointer-events="none"/></g>';
    if(editor&&options.joints){
      PARTS.forEach(function(p){
        var pos=point(m[p.id],p.pivot);
        svg+='<g data-part="'+p.id+'" class="rig-joint"><circle data-part="'+p.id+'" cx="'+pos[0]+'" cy="'+pos[1]+'" r="'+(p.id===options.selected?17:12)+'" fill="'+(p.id===options.selected?"#ffcf7b":"#bcafff")+'" stroke="#362c59" stroke-width="5"/><circle cx="'+pos[0]+'" cy="'+pos[1]+'" r="3.8" fill="#272040" pointer-events="none"/></g>';
      });
    }
    svg+='</g></svg>';return svg;
  }
  function applyPreset(character,name){
    var preset=PRESETS[name];if(!preset)return false;
    PARTS.forEach(function(p){character.pose[p.id].rotation=preset[p.id]||0;});return true;
  }
  var api={WIDTH:WIDTH,HEIGHT:HEIGHT,SLOT_COUNT:SLOT_COUNT,PARTS:PARTS,BY_ID:BY_ID,PRESETS:PRESETS,
    DRAW_ORDER:DRAW_ORDER,PATHS:PATHS,makeCharacter:makeCharacter,freshProject:freshProject,
    freshPose:freshPose,copyPose:copyPose,newPoseEntry:newPoseEntry,normalize:normalize,renderSVG:renderSVG,applyPreset:applyPreset,
    transforms:transforms,point:point,mul:mul,rotation:rotation,tr:tr,esc:esc,clamp:clamp};
  if(typeof module!=="undefined"&&module.exports)module.exports=api;
  root.GachaCore=api;
})(typeof window!=="undefined"?window:globalThis);
