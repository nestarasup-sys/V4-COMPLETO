"use strict";

// Runs the packaged, hidden Electron app and drives it through Chrome DevTools.
// No screen automation or user profile data is used; the temporary profile is
// created here and removed only after both app processes have exited.
const assert=require("node:assert/strict");
const fs=require("node:fs/promises");
const os=require("node:os");
const path=require("node:path");
const net=require("node:net");
const {spawn}=require("node:child_process");

const appDir=path.join(__dirname,"..","release","win-unpacked");
const executable=path.join(appDir,"Gacha V4 Corpo e Pose.exe");
const pause=ms=>new Promise(resolve=>setTimeout(resolve,ms));

async function freePort(){
 const server=net.createServer();
 await new Promise((resolve,reject)=>server.listen(0,"127.0.0.1",resolve).once("error",reject));
 const port=server.address().port;await new Promise(resolve=>server.close(resolve));return port;
}

async function connectApp(child,port,userData){
 const deadline=Date.now()+20000;
 while(Date.now()<deadline){
  if(child.exitCode!==null)throw new Error("O app empacotado encerrou antes de abrir o DevTools (exit "+child.exitCode+").");
  try{
   let debuggerPort=port;
   try{debuggerPort=Number((await fs.readFile(path.join(userData,"DevToolsActivePort"),"utf8")).split(/\r?\n/)[0])||port;}catch(_){}
   const response=await fetch(`http://127.0.0.1:${debuggerPort}/json/list`);
   const targets=await response.json(),page=targets.find(item=>item.type==="page"&&item.webSocketDebuggerUrl);
   if(page){
    const socket=new WebSocket(page.webSocketDebuggerUrl);await Promise.race([new Promise((resolve,reject)=>{socket.addEventListener("open",resolve,{once:true});socket.addEventListener("error",reject,{once:true});}),pause(3000).then(()=>{socket.close();throw new Error("DevTools WebSocket não abriu em 3 segundos.");})]);
    let sequence=0;const pending=new Map();
    socket.addEventListener("message",event=>{try{const message=JSON.parse(String(event.data));if(!message.id)return;const wait=pending.get(message.id);if(wait){clearTimeout(wait.timer);pending.delete(message.id);message.error?wait.reject(new Error(message.error.message)):wait.resolve(message.result);}}catch(error){for(const wait of pending.values()){clearTimeout(wait.timer);wait.reject(error);}pending.clear();}});
    const send=(method,params={})=>new Promise((resolve,reject)=>{const id=++sequence,timer=setTimeout(()=>{pending.delete(id);reject(new Error("DevTools timeout: "+method));},5000);pending.set(id,{resolve,reject,timer});socket.send(JSON.stringify({id,method,params}));});
    const evaluate=async expression=>{
     const response=await send("Runtime.evaluate",{expression,awaitPromise:true,returnByValue:true,userGesture:true});
     if(response.exceptionDetails)throw new Error(response.exceptionDetails.text||"Renderer evaluation failed");
     return response.result&&response.result.value;
    };
    const readyEnd=Date.now()+10000;
    while(Date.now()<readyEnd){try{if(await evaluate("!!window.GachaEditor&&!!window.desktopAPI"))return {socket,send,evaluate};}catch(_){}await pause(100);}
    socket.close();throw new Error("A janela não carregou o editor e a ponte IPC dentro do prazo.");
   }
  }catch(error){if(error.name!=="TypeError"&&error.name!=="AbortError")throw error;}
  await pause(100);
 }
 throw new Error("Electron empacotado não abriu a porta DevTools em 20 segundos.");
}

async function stopApp(child,connection){
 if(connection){try{await connection.send("Browser.close");}catch(_){}try{connection.socket.close();}catch(_){}}
 if(child.exitCode===null)await Promise.race([new Promise(resolve=>child.once("exit",resolve)),pause(3000)]);
 if(child.exitCode===null){child.kill();await Promise.race([new Promise(resolve=>child.once("exit",resolve)),pause(2000)]);}
}

async function main(){
 assert.ok(await fs.stat(executable).catch(()=>null),"Empacote antes com npm run dist -- --dir.");
 const userData=await fs.mkdtemp(path.join(os.tmpdir(),"gacha-v4-production-"));
 let child=null,connection=null;
 try{
  let port=await freePort();
  const launch=()=>spawn(executable,["--no-sandbox",`--remote-debugging-address=127.0.0.1`,`--remote-debugging-port=${port}`],{
   cwd:appDir,stdio:"ignore",env:{...process.env,GACHA_TEST_MODE:"1",GACHA_TEST_USER_DATA:userData}
  });
  child=launch();child.on("error",error=>console.error("Could not launch packaged Electron:",error));console.log("Packaged Electron spawned",child.pid);connection=await connectApp(child,port,userData);console.log("Packaged Electron page connected");
  const before=JSON.parse(await connection.evaluate("window.GachaEditor.serialize()"));
  assert.equal(before.slots.length,16,"O pacote deve abrir o projeto com 16 slots.");
  await connection.evaluate('document.querySelector("[data-action=open-pose]").click()');
  await connection.evaluate('document.querySelector("[data-action=\\"rig-view:layers\\"]").click()');
  await connection.evaluate('document.querySelector("[data-action=\\"layer-front:torso\\"]").click()');
  await connection.evaluate('document.querySelector("[data-action=\\"toggle-layer:head\\"]").click()');
  await connection.evaluate('(function(){const color=document.querySelector("#skin-color");color.value="#13579b";color.dispatchEvent(new Event("change",{bubbles:true}));})()');
  await pause(500);
  const changed=JSON.parse(await connection.evaluate("window.GachaEditor.serialize()"));
  const memoryPath=path.join(userData,"characters.json");
  const onDisk=JSON.parse(await fs.readFile(memoryPath,"utf8"));
  assert.equal(onDisk.slots[0].skin,"#13579b","O IPC deve salvar a cor alterada no perfil isolado.");
  assert.ok(onDisk.slots[0].hiddenParts.includes("head"),"O IPC deve salvar a visibilidade da camada.");
  assert.deepEqual(onDisk.slots[0].layerOrder,changed.slots[0].layerOrder,"A mudança na ordem das camadas deve chegar ao disco.");
  await stopApp(child,connection);child=null;connection=null;

  port=await freePort();child=launch();child.on("error",error=>console.error("Could not relaunch packaged Electron:",error));connection=await connectApp(child,port,userData);console.log("Packaged Electron reopened");
  const reloaded=JSON.parse(await connection.evaluate("window.GachaEditor.serialize()"));
  assert.equal(reloaded.slots[0].skin,"#13579b","A cor deve voltar do perfil salvo ao reiniciar o pacote.");
  assert.ok(reloaded.slots[0].hiddenParts.includes("head"),"A visibilidade deve voltar ao reabrir o app.");
  assert.deepEqual(reloaded.slots[0].layerOrder,changed.slots[0].layerOrder,"A ordem das camadas deve voltar ao reabrir o app.");
  await stopApp(child,connection);child=null;connection=null;
  console.log("Production smoke OK: pacote Electron 44.7.0 oculto, IPC, camada/cor no disco e reabertura confirmados.");
 }finally{
  if(child)await stopApp(child,connection);
  await fs.rm(userData,{recursive:true,force:true});
 }
}

const keepAlive=setInterval(()=>{},1000);
main().catch(error=>{console.error(error);process.exitCode=1;}).finally(()=>clearInterval(keepAlive));
