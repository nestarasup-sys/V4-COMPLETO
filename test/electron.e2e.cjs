"use strict";
const assert=require("node:assert/strict");
const fs=require("node:fs/promises");
const os=require("node:os");
const path=require("node:path");
const { _electron:electron }=require("playwright");

const root=path.resolve(__dirname,"..");
const artifacts=path.join(root,"artifacts");
const sleep=ms=>new Promise(resolve=>setTimeout(resolve,ms));
const progress=message=>process.stdout.write("[E2E] "+message+"\n");
async function waitForFile(file,timeout=15000){
 const expires=Date.now()+timeout;
 while(Date.now()<expires){try{await fs.access(file);return;}catch(_){await sleep(100);}}
 throw new Error("Arquivo não foi criado dentro de "+timeout+" ms: "+file);
}

async function setWindowSize(app,width,height){
 await app.evaluate(({BrowserWindow},size)=>BrowserWindow.getAllWindows()[0].setSize(size.width,size.height),{width,height});
 await sleep(200);
}
async function dragPart(page,id,dx,dy){
 const part=page.locator('#editor-stage path[data-part="'+id+'"]').first();
 const box=await part.boundingBox();assert.ok(box,"SVG da peça "+id+" deve estar visível");
 const x=box.x+box.width*.55,y=box.y+box.height*.47;
 await page.mouse.move(x,y);await page.mouse.down();
 await page.mouse.move(x+dx,y+dy,{steps:4});await page.mouse.up();
 await sleep(40);
}

async function run(){
 const temporary=await fs.mkdtemp(path.join(os.tmpdir(),"gacha-v4-e2e-"));
 const profile=path.join(temporary,"profile"),projectFile=path.join(temporary,"characters.json");
 const poseFile=path.join(temporary,"poses.json"),importFile=path.join(temporary,"poses-import.json");
 const pngFile=path.join(temporary,"character.png");
 let app;
 try{
  await fs.mkdir(artifacts,{recursive:true});
  const env={...process.env,GACHA_TEST_MODE:"1",GACHA_TEST_USER_DATA:profile};
  const launchOptions={args:process.env.GACHA_TEST_EXECUTABLE?[]:[root],cwd:root,env,timeout:30000};
  if(process.env.GACHA_TEST_EXECUTABLE)launchOptions.executablePath=process.env.GACHA_TEST_EXECUTABLE;
  app=await electron.launch(launchOptions);
  const page=await app.firstWindow({timeout:30000});
  await page.waitForFunction(()=>!!window.GachaEditor,{timeout:15000});
  await page.setDefaultTimeout(10000);
  progress("janela iniciada; verificando layout e biblioteca");

  assert.equal(await page.locator(".slot").count(),16,"a biblioteca deve ter 16 slots");
  assert.equal(await page.locator(".slot.occupied").count(),1,"o primeiro slot inicia ocupado");
  assert.equal(await page.locator("#editor-stage [data-part]").count()>0,true,"o rig deve ser renderizado");
  assert.equal(await page.locator("#part-list .part-item").count(),10,"a interface deve listar as dez peças");
  assert.equal(await page.locator("#pose-library-grid .pose-card").count(),5,"a biblioteca deve incluir cinco poses iniciais");
  const frameRatio=await page.locator(".phone").evaluate(el=>el.getBoundingClientRect().width/el.getBoundingClientRect().height);
  assert.ok(Math.abs(frameRatio-9/16)<.03,"a prévia deve manter a proporção 9:16");

  await setWindowSize(app,1366,768);
  assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=window.innerWidth),true,"sem rolagem horizontal em 1366×768");
  assert.equal(await page.evaluate(()=>document.documentElement.scrollHeight<=window.innerHeight+1),true,"sem rolagem da página em 1366×768");
  if(!process.env.GACHA_TEST_EXECUTABLE)await page.screenshot({path:path.join(artifacts,"electron-1366x768.png"),fullPage:false,timeout:30000});
  await setWindowSize(app,1920,1080);
  assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=window.innerWidth),true,"sem rolagem horizontal em 1920×1080");
  assert.equal(await page.evaluate(()=>document.documentElement.scrollHeight<=window.innerHeight+1),true,"sem rolagem da página em 1920×1080");
  if(!process.env.GACHA_TEST_EXECUTABLE)await page.screenshot({path:path.join(artifacts,"electron-1920x1080.png"),fullPage:false,timeout:30000});
  progress(process.env.GACHA_TEST_EXECUTABLE?"layout responsivo do executável verificado":"capturas responsivas aprovadas");

  await page.locator('.slot[data-slot="0"]').click();
  await page.locator('[data-action="preset:aceno"]').click();
  await page.locator('.slot[data-slot="1"]').click();
  await page.locator('[data-action="preset:corrida"]').click();
  await page.locator('[data-tab="project"]').click();
  await page.locator("#character-name").fill("Corredora");
  await page.locator('[data-tab="body"]').click();
  await page.locator('input[data-pose-field="rotation"]').fill("31.5");
  assert.equal(await page.evaluate(()=>window.GachaEditor.current().pose.head.rotation),31.5,"o campo numérico atualiza a pose ao digitar");
  await page.locator("#undo-btn").click();
  assert.notEqual(await page.evaluate(()=>window.GachaEditor.current().pose.head.rotation),31.5,"undo desfaz o campo numérico como uma ação");
  await page.locator("#redo-btn").click();
  assert.equal(await page.evaluate(()=>window.GachaEditor.current().pose.head.rotation),31.5,"refazer restaura a edição numérica");
  await page.keyboard.press("Control+z");
  assert.notEqual(await page.evaluate(()=>window.GachaEditor.current().pose.head.rotation),31.5,"atalho Ctrl+Z desfaz a edição");
  await page.keyboard.press("Control+y");
  assert.equal(await page.evaluate(()=>window.GachaEditor.current().pose.head.rotation),31.5,"atalho Ctrl+Y refaz a edição");

  await page.locator('[data-tool="rotate"]').click();
  await dragPart(page,"head",24,0);
  const headAfterDrag=await page.evaluate(()=>window.GachaEditor.current().pose.head.rotation);
  assert.notEqual(headAfterDrag,31.5,"arrastar a cabeça altera sua rotação");
  await page.locator('[data-tool="move"]').click();
  await page.locator('.part-item[data-part-select="armLL"]').click();
  await dragPart(page,"armLL",15,8);
  assert.notEqual(await page.evaluate(()=>window.GachaEditor.current().pose.armLL.x),0,"arrastar o cotovelo altera a peça");
  await page.locator('.part-item[data-part-select="legLL"]').click();
  await dragPart(page,"legLL",15,8);
  assert.notEqual(await page.evaluate(()=>window.GachaEditor.current().pose.legLL.x),5,"arrastar o joelho altera a peça");

  await page.locator('[data-action="mirror"]').click();
  assert.equal(await page.evaluate(()=>window.GachaEditor.current().mirrored),true,"espelhamento troca o estado visual");
  await page.locator("#undo-btn").click();
  assert.equal(await page.evaluate(()=>window.GachaEditor.current().mirrored),false,"undo restaura o espelhamento");
  await page.locator("#redo-btn").click();
  assert.equal(await page.evaluate(()=>window.GachaEditor.current().mirrored),true,"redo reaplica o espelhamento");

  await page.evaluate(()=>{window.prompt=(_message,initial)=>initial==="Minha pose"?"Aceno pessoal":"Pose renomeada";window.confirm=()=>true;});
  await page.locator('[data-action="save-pose"]').click();
  assert.equal(await page.locator("#pose-library-grid .pose-card").count(),6,"salvar cria uma pose personalizada");
  const savedPoseId=await page.locator(".pose-card").filter({hasText:"Aceno pessoal"}).first().locator('[data-pose-action="apply"]').getAttribute("data-pose-id");
  const savedCard=page.locator(".pose-card").filter({has:page.locator('[data-pose-action="apply"][data-pose-id="'+savedPoseId+'"]')});
  await savedCard.locator('[data-pose-action="apply"]').click();
  await savedCard.locator('[data-pose-action="duplicate"]').click();
  assert.equal(await page.locator("#pose-library-grid .pose-card").count(),7,"duplicar cria um snapshot isolado");
  await app.evaluate(({dialog},file)=>{dialog.showSaveDialog=async()=>({canceled:false,filePath:file});},poseFile);
  await page.locator('[data-action="export-poses"]').click();
  await waitForFile(poseFile);
  const exportedPoses=JSON.parse(await fs.readFile(poseFile,"utf8"));
  assert.equal(exportedPoses.format,"gacha-pose-library-v1");assert.equal(exportedPoses.poses.length,7);
  exportedPoses.poses=[{...exportedPoses.poses[0],id:"imported-pose",name:"Pose importada"}];
  await fs.writeFile(importFile,JSON.stringify(exportedPoses),"utf8");
  await app.evaluate(({dialog},file)=>{dialog.showOpenDialog=async()=>({canceled:false,filePaths:[file]});},importFile);
  await page.locator('[data-action="import-poses"]').click();
  await page.waitForFunction(()=>document.querySelector("#pose-library-grid").innerText.includes("Pose importada"));
  progress("CRUD e importação/exportação de poses aprovados");
  assert.ok(await page.locator("#pose-library-grid").innerText().then(text=>text.includes("Pose importada")),"importar anexa a pose à biblioteca");

  await page.locator('.slot[data-slot="2"]').click();
  const sourcePose=await page.evaluate(()=>window.GachaEditor.state.project.slots[1].pose);
  await savedCard.locator('[data-pose-action="apply"]').click();
  const copiedPose=await page.evaluate(()=>window.GachaEditor.current().pose);
  assert.equal(copiedPose.head.rotation,sourcePose.head.rotation,"uma pose pode ser copiada entre personagens");
  assert.equal(copiedPose.armLL.x,sourcePose.armLL.x,"a pose copiada preserva também posições das peças");
  await page.locator('[data-action="preset:sentada"]').click();
  assert.equal(await page.locator(".slot.occupied").count(),3,"três personagens podem ter estado independente");
  const states=await page.evaluate(()=>{
   const project=JSON.parse(window.GachaEditor.serialize());
   return {version:project.version,poses:project.poses.length,slots:project.slots.map(ch=>ch&&({name:ch.name,head:ch.pose.head.rotation,armRU:ch.pose.armRU.rotation,legLU:ch.pose.legLU.rotation}))};
  });
  assert.equal(states.version,2);assert.equal(states.poses,8);
  assert.equal(states.slots[0].armRU,-55);assert.equal(states.slots[1].name,"Corredora");assert.equal(states.slots[1].head,headAfterDrag);assert.equal(states.slots[2].legLU,-68);

  await app.evaluate(({dialog},file)=>{dialog.showSaveDialog=async()=>({canceled:false,filePath:file});},projectFile);
  await page.locator('[data-action="export-json"]').first().click();
  await waitForFile(projectFile);
  const exportedProject=JSON.parse(await fs.readFile(projectFile,"utf8"));assert.equal(exportedProject.slots.filter(Boolean).length,3);
  await app.evaluate(({dialog},file)=>{dialog.showOpenDialog=async()=>({canceled:false,filePaths:[file]});},projectFile);
  await page.locator('[data-tab="project"]').click();
  await page.locator('[data-action="import-json"]').click();
  await page.waitForFunction(()=>JSON.parse(window.GachaEditor.serialize()).slots.filter(Boolean).length===3);
  await app.evaluate(({dialog},file)=>{dialog.showSaveDialog=async()=>({canceled:false,filePath:file});},pngFile);
  await page.locator('[data-action="export-png"]').first().click();
  await waitForFile(pngFile);
  const png=await fs.readFile(pngFile);
  assert.equal(png.subarray(0,8).toString("hex"),"89504e470d0a1a0a","exporta arquivo PNG válido");
  assert.equal(png.readUInt8(25),6,"PNG RGBA preserva o canal alpha");
  progress("importação/exportação JSON e PNG com alpha aprovadas");

  await sleep(500);
  await app.close();app=null;
  app=await electron.launch(launchOptions);
  const reopened=await app.firstWindow({timeout:30000});
  await reopened.waitForFunction(()=>window.GachaEditor&&JSON.parse(window.GachaEditor.serialize()).slots.filter(Boolean).length===3,{timeout:15000});
  const restored=await reopened.evaluate(()=>JSON.parse(window.GachaEditor.serialize()));
  assert.equal(restored.slots[0].pose.armRU.rotation,-55);assert.equal(restored.slots[1].name,"Corredora");
  assert.equal(restored.slots[1].pose.head.rotation,headAfterDrag);assert.equal(restored.slots[2].pose.legLU.rotation,-68);
  assert.ok(restored.poses.some(pose=>pose.name==="Pose importada"),"biblioteca persiste após reiniciar o Electron");
  progress("persistência após fechar e reabrir o Electron aprovada");
  await app.close();app=null;
  process.stdout.write("Electron E2E aprovado: slots, 16 itens, rig, poses, undo/redo, import/export JSON/PNG alpha e persistência. Capturas 1366×768 e 1920×1080 em artifacts/.\n");
 }finally{
  if(app)await app.close().catch(()=>{});
  if(path.basename(temporary).startsWith("gacha-v4-e2e-"))await fs.rm(temporary,{recursive:true,force:true});
 }
}
run().catch(error=>{console.error(error);process.exitCode=1;});
