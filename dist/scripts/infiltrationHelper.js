// --- Functions used in window creation - usually in exports file --- //
const pxToNum = (input) => Number(input.replaceAll('px', ''));
const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));
const enableEdgeDetection = async (el) => {
    while (eval('document').body.contains(el)) {
        const cs = window.getComputedStyle(el);
        const pos = { l: pxToNum(cs.left), r: pxToNum(cs.right), t: pxToNum(cs.top), b: pxToNum(cs.bottom) };
        el.style.top = (pos.b < 0 ? pos.t + pos.b : pos.t < 0 ? 0 : pos.t) + 'px';
        el.style.left = (pos.r < 0 ? pos.l + pos.r : pos.l < 0 ? 0 : pos.l) + 'px';
        await sleep(100);
    }
};
const pressKey = (key) => {
    const event = new KeyboardEvent('keydown', { 'key': key, bubbles: true });
    eval('document').activeElement.dispatchEvent(event);
};
const pressKeyCode = (keyCode, hasShift) => {
    const event = new KeyboardEvent('keydown', { keyCode, shiftKey: hasShift, bubbles: true });
    eval('document').activeElement.dispatchEvent(event);
};
const createWindow = (prefix, title, mainContent) => {
    const el = eval('document').createElement('div');
    el.setAttribute('style', `position:absolute;width:min-content;left:100px;top:100px;border:1px solid white;background-color:rgba(57, 54, 54, 0.7);z-index:10;`);
    el.id = `${prefix}-created-window`;
    const elText = `document.getElementById('${el.id}')`;
    el.innerHTML = `<h2 id="${prefix}-header" style="background-color:#555;color:white;margin:0px 0px;text-align:center;padding:0px 25px;"><div id="${prefix}-dragger" onmousedown="event.preventDefault();X=event.clientX;Y=event.clientY;Left=${elText}.offsetLeft;Top=${elText}.offsetTop;document.onmousemove=e=>{Left+=e.clientX-X;Top+=e.clientY-Y;${elText}.style.left=Left+'px';${elText}.style.top=Top+'px';X=e.clientX;Y=e.clientY;};document.onmouseup=()=>{document.onmousemove=null;document.onmouseup=null;};" style="position:absolute;left:1px;right:1px;top:1px;height:18px;cursor:move;"></div>${title.replaceAll(' ', '&nbsp;')}<span onclick="${elText}.remove();" style="position:absolute;right:2px;height:20px;margin-top:1px;cursor:pointer">✕</span></h2>${mainContent}`;
    eval('document').body.appendChild(el);
    enableEdgeDetection(el);
    return el;
};
const parseMineField = (container) => {
    const rows = Array.from(container.childNodes)
        .slice(1, container.childNodes.length - 1);
    const elementGrid = Array.from(rows.map((row) => Array.from(row.querySelectorAll('span'))));
    const numRows = elementGrid.length;
    const numColumns = elementGrid[0].length;
    const matrix = [...Array(numRows)].map(e => Array(numColumns).fill(0));
    for (let i = 0; i < elementGrid.length; i++) {
        const row = elementGrid[i];
        for (let j = 0; j < row.length; j++) {
            matrix[i][j] = elementGrid[i][j].innerText.includes('?');
        }
    }
    return matrix;
};
const parseCyberpunkField = (elements) => {
    const dimensions = Math.sqrt(elements.length);
    const matrix = [...Array(dimensions)].map(e => {
        return new Array(dimensions).fill('');
    });
    elements.forEach((element, index) => {
        const row = Math.floor(index / dimensions);
        const column = index % dimensions;
        matrix[row][column] = elements[index].innerText.replace(/\s/g, '');
    });
    return matrix;
};
const colorStringToColor = (s) => {
    switch (s) {
        case 'red':
            return 'red';
        case 'yellow':
            return 'rgb(255, 193, 7)';
        case 'blue':
            return 'blue';
        case 'white':
            return 'white';
        default:
            return '';
    }
};
// --- Main function --- //
export const main = async (ns) => {
    // --- Declarations --- //
    const infilContainer = eval('document').querySelector('#infiltration-container');
    const mainContent = `<p style="font-size:11px">Assistance:<input type=checkbox class=checkbox id="infil-assistance-toggle" checked /></p><p id="infil-helper-content"></p>`;
    const infilWin = createWindow('infil', 'Infiltration Helper', mainContent);
    const helperContent = infilWin.querySelector('#infil-helper-content');
    const assistanceToggle = infilWin.querySelector('#infil-assistance-toggle');
    const changeContent = (content) => helperContent.innerHTML = content;
    const getGameText = () => {
        try {
            return infilContainer.children[0].children[1].children[0].children[1].children[0].innerText;
        }
        catch (e) {
            return null;
        }
    };
    // --- Main Loop --- //
    while (eval('document').body.contains(infilWin)) {
        while (getGameText() && assistanceToggle.checked) {
            switch (getGameText()) {
                case 'Remember all the mines!':
                    const minefield = infilContainer.children[0].children[1].children[0].children[1];
                    const matrix = parseMineField(minefield);
                    const rowLength = matrix[0].length;
                    const currentLocation = { x: 0, y: 0 };
                    changeContent(`Game: Minesweeper<br>${minefield.innerHTML}`);
                    while (getGameText() === 'Remember all the mines!')
                        await ns.sleep(50);
                    while (getGameText() === 'Mark all the mines!') {
                        if (matrix[currentLocation.y][currentLocation.x]) {
                            pressKeyCode(32, false);
                        }
                        if (currentLocation.x === rowLength - 1) {
                            pressKeyCode(39, false);
                            pressKeyCode(40, false);
                            currentLocation.x = 0;
                            currentLocation.y++;
                        }
                        else {
                            pressKeyCode(39, false);
                            currentLocation.x++;
                        }
                    }
                    break;
                case 'Type it backward':
                    const fullTypingChallenge = infilContainer.querySelector(`[style="transform: scaleX(-1);"]`).innerText;
                    changeContent(`Game: Type Backwards`);
                    const keys = fullTypingChallenge.toLowerCase().split('');
                    for (const key of keys) {
                        pressKey(key);
                    }
                    while (getGameText() === 'Type it backward') {
                        await ns.sleep(100);
                        ns.tprint('Waiting for completion');
                    }
                    break;
                case 'Say something nice about the guard.':
                    const niceWords = ['affectionate', 'agreeable', 'bright', 'charming', 'creative',
                        'determined', 'diplomatic', 'dynamic', 'energetic', 'friendly',
                        'funny', 'generous', 'giving', 'hardworking', 'helpful', 'kind',
                        'likable', 'loyal', 'patient', 'polite'];
                    while (getGameText() === 'Say something nice about the guard.') {
                        const isNice = (niceWords.includes(infilContainer.querySelectorAll(`h2[style="font-size: 2em;"]`)[1].innerText));
                        changeContent(`Game: Say Something Nice`);
                        if (!isNice) {
                            pressKeyCode(40, false);
                        }
                        else {
                            pressKeyCode(32, false);
                        }
                    }
                    break;
                case 'Match the symbols!':
                    const targetContainer = infilContainer.querySelector(`h2[style="font-size: 2em;"]`);
                    const cyberpunkFieldElements = Array.from(infilContainer.querySelectorAll(`span[style="font-size: 2em;"], span[style="font-size: 2em; color: blue;"]`));
                    const targets = Array.from(targetContainer.childNodes);
                    const targetStrings = targets.filter((element) => element.innerText != null)
                        .map((element) => element.innerText.replace(/\s/g, ''));
                    const cyberPunkField = parseCyberpunkField(cyberpunkFieldElements);
                    changeContent('Game: Hexcode Match<br>No assistance to provide.');
                    let location = { x: 0, y: 0 };
                    while (getGameText() === 'Match the symbols!') {
                        const nextTarget = targetStrings.shift();
                        if (!nextTarget)
                            break;
                        let target = { x: 0, y: 0 };
                        for (let i = 0; i < cyberPunkField.length; i++) {
                            for (let j = 0; j < cyberPunkField[i].length; j++) {
                                if (cyberPunkField[i][j] === nextTarget) {
                                    // NOTE: We swapped i and j here to make the logic correct
                                    target = { x: j, y: i };
                                }
                            }
                        }
                        const horizontalDifference = target.x - location.x;
                        const verticalDifference = target.y - location.y;
                        for (let deltaX = 0; deltaX < Math.abs(horizontalDifference); deltaX++) {
                            if (horizontalDifference === 0)
                                break;
                            else if (horizontalDifference > 0) {
                                pressKeyCode(39, false);
                            }
                            else if (horizontalDifference < 0) {
                                pressKeyCode(37, false);
                            }
                        }
                        for (let deltaY = 0; deltaY < Math.abs(verticalDifference); deltaY++) {
                            if (verticalDifference === 0)
                                break;
                            else if (verticalDifference > 0) {
                                pressKeyCode(40, false);
                            }
                            else if (verticalDifference < 0) {
                                pressKeyCode(38, false);
                            }
                        }
                        location = target;
                        pressKeyCode(32, false);
                    }
                    break;
                case 'Cut the wires with the following properties!':
                    const wireTargetElements = Array.from(infilContainer.children[0].children[1].querySelectorAll('h3'));
                    const wireElements = Array.from(infilContainer.children[0].children[1].querySelectorAll('span'))
                        .filter((element) => isNaN(+element.innerText));
                    const numWires = Array.from(infilContainer.children[0].children[1].querySelectorAll('span'))
                        .filter((element) => !isNaN(+element.innerText)).length;
                    const wires = [...Array(numWires)].map(element => {
                        return [];
                    });
                    for (let i = 0; i < wireElements.length; i++) {
                        wires[i % numWires].push(wireElements[i]);
                    }
                    const numberRegExp = /Cut wires number (\d+)./g;
                    const colorRegExp = /Cut all wires colored (\w+)./g;
                    const numberTargets = [];
                    const colorTargets = [];
                    for (const wireTargetElement of wireTargetElements) {
                        const numberMatch = numberRegExp.exec(wireTargetElement.innerHTML);
                        const colorMatch = colorRegExp.exec(wireTargetElement.innerHTML);
                        if (numberMatch) {
                            numberTargets.push(parseInt(numberMatch[1], 10));
                        }
                        else if (colorMatch) {
                            colorTargets.push(colorStringToColor(colorMatch[1]));
                        }
                    }
                    for (let index = 0; index < wires.length; index++) {
                        const wire = wires[index];
                        if (wire.some((element) => colorTargets.includes(element.style.color))) {
                            numberTargets.push(index + 1);
                        }
                    }
                    for (const n of numberTargets) {
                        pressKey(n.toString());
                    }
                    changeContent('Game: Wire Cutting');
                    while (getGameText() === 'Cut the wires with the following properties!')
                        await ns.sleep(100);
                    break;
                case 'Enter the Code!':
                    changeContent('Game: Enter Code');
                    while (getGameText() === 'Enter the Code!') {
                        const codeContainer = infilContainer.querySelector(`p[style="font-size: 5em;"]`);
                        const arrow = codeContainer.innerText;
                        switch (arrow) {
                            case '←':
                                pressKeyCode(37, false);
                                break;
                            case '→':
                                pressKeyCode(39, false);
                                break;
                            case '↑':
                                pressKeyCode(38, false);
                                break;
                            case '↓':
                                pressKeyCode(40, false);
                                break;
                        }
                    }
                    break;
                case 'Close the brackets':
                    const brackets = infilContainer.children[0].children[1].children[0].children[1].children[1].innerText;
                    const openingBrackets = brackets.split('').filter((bracket) => bracket !== '|');
                    changeContent('Game: Close Brackets');
                    for (const bracket of openingBrackets.reverse()) {
                        switch (bracket) {
                            case '(':
                                pressKeyCode(48, true);
                                break;
                            case '[':
                                pressKeyCode(221, false);
                                break;
                            case '{':
                                pressKeyCode(221, true);
                                break;
                            case '<':
                                pressKeyCode(190, true);
                                break;
                        }
                    }
                    while (getGameText() === 'Close the brackets') {
                        await ns.sleep(100);
                        ns.tprint('Waiting for completion');
                    }
                    break;
                case 'Slash when his guard is down!':
                    changeContent('Game: Slash the Guard');
                    while (getGameText() === 'Slash when his guard is down!') {
                        const element = infilContainer.querySelector(`p[style="font-size: 5em;"]`);
                        if (element.innerText === '!Guarding!')
                            await ns.sleep(10);
                        else {
                            pressKeyCode(32, false);
                        }
                    }
                    break;
                default:
                    changeContent('Game not recognized');
                    await ns.sleep(100);
                    break;
            }
            await ns.sleep(100);
        }
        changeContent(assistanceToggle.checked ? 'No game active' : 'Assistance not enabled');
        await ns.sleep(100);
    }
};
