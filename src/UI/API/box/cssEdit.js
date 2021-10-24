// /API/box/cssEdit.ns by omuretsu (updated 12OCT2021)
// Purpose: Provide an editor for Box API CSS styles from within game using the Box API.
import { createBox, doc } from "/src/UI/API/box.js";

export let main=async ns=>{
    let mainContent = `<p class=small><button id="css-load-button">Load</button> <button id="css-save-button">Save</button> <button id="css-load1-button">Refresh</button> <button id="css-save1-button">Preview</button> <button id="css-minify-button">Minify</button> <button id="css-beautify-button">Beautify</button></p><textarea spellcheck=false id="css-textarea"></textarea>`,
        cssBox = createBox("CSS Editor",mainContent),
        cssElem = doc.querySelector(`#boxCSS`),
        cssText = cssBox.querySelector('textarea'),
        loadFromFile=()=>cssText.value=ns.read("/API/box/css.ns").replace(/^export let css=`|`;$/g,"");

    cssBox.querySelector(`#css-load1-button`).addEventListener('click',()=>cssText.value=cssElem.innerHTML);
    cssBox.querySelector(`#css-load-button`).addEventListener('click',loadFromFile);
    cssBox.querySelector(`#css-save1-button`).addEventListener('click',()=>cssElem.innerHTML=cssText.value);
    cssBox.querySelector(`#css-save-button`).addEventListener('click',async ()=>await ns.write("/API/box/css.ns",`export let css=\`${cssText.value}\`;`,"w"));
    cssBox.querySelector(`#css-minify-button`).addEventListener('click',()=>cssText.value=cssText.value.replace(/(?<=[{:;}])\s+/g,"").replace(/\s+(?={)|;(?=})/g,""));
    cssBox.querySelector(`#css-beautify-button`).addEventListener('click',()=>cssText.value=cssText.value.replace(/(?<=[{;}])|(?=})/g,"\n  ").replace(/\n  }\s+/g,";\n}\n"));
    loadFromFile();
    while(doc.body.contains(cssBox)) await ns.sleep(1000);
};