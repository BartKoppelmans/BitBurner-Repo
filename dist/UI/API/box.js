// /API/box.ns by omuretsu (updated 12OCT2021)
// Usage: Import createBox into your script and call it to create a window box with whatever custom content is
// specified in mainContent.
import { css } from "/src/UI/API/box/css.js";
let i = parseInt;
export let doc = eval("document");
let addLog = (el, log) => [el.insertAdjacentHTML('beforeend', `<p><span class=p>[${new Date().toLocaleTimeString("en-gb")}]</span> ${log}</p>`), el.scrollTop = el.scrollHeight];
let edgeDetection = (box, cs = getComputedStyle(box), st = box.style, ot = box.offsetTop, ol = box.offsetLeft) => [st.top = (ot < 0 ? 0 : i(cs.bottom) < 0 ? ot + i(cs.bottom) : ot) + 'px', st.left = (ol < 0 ? 0 : i(cs.right) < 0 ? ol + i(cs.right) : ol) + 'px'];
let boxDragStart = (box, s, e) => {
    e.preventDefault();
    let boxDragger = box.querySelector(".boxdrag");
    boxDragger.classList.add("dragging");
    let [x, y, left, top] = [e.clientX, e.clientY, box.offsetLeft, box.offsetTop];
    let boxDrag = e => [left, top, s.left, s.top, x, y] = [left + e.clientX - x, top + e.clientY - y, left + 'px', top + 'px', e.clientX, e.clientY];
    let boxDragEnd = e => [doc.removeEventListener('mouseup', boxDragEnd), doc.removeEventListener('mousemove', boxDrag), boxDragger.classList.remove("dragging")];
    doc.addEventListener('mouseup', boxDragEnd), doc.addEventListener('mousemove', boxDrag);
};
let resizeStart = (r, s, e) => {
    if (r != e.target)
        return;
    e.preventDefault();
    let [x, y, w, h] = [e.clientX, e.clientY, i(s.width), i(s.height)];
    let resizeDrag = e => [w, h, x, y, s.width, s.height] = [w + e.clientX - x, h + e.clientY - y, e.clientX, e.clientY, w + "px", h + "px"];
    let resizeEnd = e => [doc.removeEventListener('mouseup', resizeEnd), doc.removeEventListener('mousemove', resizeDrag)];
    doc.addEventListener('mouseup', resizeEnd), doc.addEventListener('mousemove', resizeDrag);
};
export let createBox = (title, mainContent, id = `box${doc.querySelectorAll(".box").length}`) => {
    while (doc.getElementById(id))
        id += "_0";
    doc.getElementById("boxCSS") || doc.head.insertAdjacentHTML('beforeend', `<style id='boxCSS'>${css}</style>`);
    doc.body.insertAdjacentHTML('beforeend', `<div class="box" id="${id}"><h2 class="boxhead"><div class="boxdrag"></div>${title}<span class="boxclose">✕</span></h2>${mainContent}</div>`);
    let box = doc.getElementById(`${id}`);
    box.querySelectorAll('.resizable').forEach(r => r.addEventListener("mousedown", resizeStart.bind(null, r, r.style)));
    box.querySelectorAll('.log').forEach(l => l.addLog = addLog.bind(null, l));
    box.querySelector(".boxdrag").addEventListener('mousedown', boxDragStart.bind(null, box, box.style)), box.querySelector(".boxclose").addEventListener('click', () => box.remove()), setInterval(() => edgeDetection(box), 300);
    return box;
};
