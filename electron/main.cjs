"use strict";
const {app,BrowserWindow,dialog,ipcMain}=require("electron");
const fs=require("node:fs/promises");
const path=require("node:path");
const testMode=process.env.GACHA_TEST_MODE==="1";
if(testMode&&process.env.GACHA_TEST_USER_DATA)app.setPath("userData",path.resolve(process.env.GACHA_TEST_USER_DATA));
function projectPath(){return path.join(app.getPath("userData"),"characters.json");}
function safeName(name,ext){
 const result=path.basename(String(name||("gacha-v4."+ext))).replace(/[^\w .()À-ÿ-]/g,"_").slice(0,100);
 return result.toLowerCase().endsWith("."+ext)?result:result+"."+ext;
}
function validateText(data){
 if(typeof data!=="string"||Buffer.byteLength(data)>5*1024*1024)throw new Error("Arquivo muito grande.");
 const parsed=JSON.parse(data);
  const project=parsed.format==="gacha-body-v1"&&[1,2].includes(parsed.version)&&Array.isArray(parsed.slots)&&parsed.slots.length===16;
  const poses=parsed.format==="gacha-pose-library-v1"&&parsed.version===1&&Array.isArray(parsed.poses)&&parsed.poses.length<=100;
  if(!project&&!poses)throw new Error("Formato de projeto ou biblioteca de poses inválido.");
 return data;
}
function createWindow(){
 const win=new BrowserWindow({width:1550,height:960,minWidth:950,minHeight:680,show:!testMode,backgroundColor:"#171526",
  autoHideMenuBar:true,webPreferences:{preload:path.join(__dirname,"preload.cjs"),contextIsolation:true,nodeIntegration:false,sandbox:true,webSecurity:true}});
 win.webContents.setWindowOpenHandler(()=>({action:"deny"}));
 win.webContents.on("will-navigate",event=>event.preventDefault());
 win.loadFile(path.join(__dirname,"..","index.html"));
}
app.whenReady().then(()=>{
 ipcMain.handle("project:load",async()=>{
  try{return validateText(await fs.readFile(projectPath(),"utf8"));}catch(err){if(err.code==="ENOENT")return null;throw err;}
 });
 ipcMain.handle("project:autosave",async(_e,data)=>{
  validateText(data);
  const target=projectPath(),temp=target+".tmp";
  await fs.mkdir(path.dirname(target),{recursive:true});
  await fs.writeFile(temp,data,"utf8");await fs.rename(temp,target);
  return true;
 });
 ipcMain.handle("file:openText",async()=>{
  const result=await dialog.showOpenDialog({title:"Importar personagens",filters:[{name:"Projeto Gacha",extensions:["json"]}],properties:["openFile"]});
  if(result.canceled||!result.filePaths.length)return null;
  const stat=await fs.stat(result.filePaths[0]);if(stat.size>5*1024*1024)throw new Error("JSON muito grande.");
  return await fs.readFile(result.filePaths[0],"utf8");
 });
 ipcMain.handle("file:saveText",async(_e,name,data)=>{
  validateText(data);
  const result=await dialog.showSaveDialog({title:"Exportar projeto",defaultPath:safeName(name,"json"),filters:[{name:"Projeto Gacha",extensions:["json"]}]});
  if(result.canceled||!result.filePath)return false;
  await fs.writeFile(result.filePath,data,"utf8");return true;
 });
 ipcMain.handle("file:saveImage",async(_e,name,data)=>{
  if(typeof data!=="string"||data.length>30*1024*1024||!/^data:image\/png;base64,[A-Za-z0-9+/=]+$/.test(data))throw new Error("Imagem PNG inválida.");
  const result=await dialog.showSaveDialog({title:"Exportar personagem",defaultPath:safeName(name,"png"),filters:[{name:"Imagem PNG",extensions:["png"]}]});
  if(result.canceled||!result.filePath)return false;
  await fs.writeFile(result.filePath,Buffer.from(data.slice("data:image/png;base64,".length),"base64"));return true;
 });
 createWindow();app.on("activate",()=>{if(BrowserWindow.getAllWindows().length===0)createWindow();});
});
app.on("window-all-closed",()=>{if(process.platform!=="darwin")app.quit();});
