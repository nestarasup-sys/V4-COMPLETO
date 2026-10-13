"use strict";
const {contextBridge,ipcRenderer}=require("electron");
contextBridge.exposeInMainWorld("desktopAPI",Object.freeze({
 loadAutosave:()=>ipcRenderer.invoke("project:load"),
 autosave:(data)=>ipcRenderer.invoke("project:autosave",data),
 openText:()=>ipcRenderer.invoke("file:openText"),
 saveText:(name,data)=>ipcRenderer.invoke("file:saveText",name,data),
 saveImage:(name,data)=>ipcRenderer.invoke("file:saveImage",name,data)
}));
