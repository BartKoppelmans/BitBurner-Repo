import { DOMcreateElement } from '/src/UI/API/index.js'

const css = String.raw

export const Colors: Record<string, string> = {
	'primarylight': '#00FF33',
	'primary': '#00CC22',
	'primarydark': '#091',
	'errorlight': '#FF3333',
	'error': '#CC2222',
	'errordark': '#911',
	'secondarylight': '#AAA',
	'secondary': '#888',
	'secondarydark': '#666',
	'warninglight': '#ff3',
	'warning': '#cc2',
	'warningdark': '#991',
	'infolight': '#3ff',
	'info': '#2cc',
	'infodark': '#199',
	'welllight': '#666',
	'well': '#000',
	'white': '#FFFFFF',
	'black': '#222',
	'hp': '#f33',
	'money': '#FFFF33',
	'hack': '#0f3',
	'combat': '#FFFFFF',
	'cha': '#f8f',
	'int': '#f08',
	'rep': '#fff',
	'disabled':'#CC2222'
}

export const Styles = (
    <style>{css`
      .box table {
        border-collapse: collapse;
      }

      .box * {
        font-family: "Lucida Console", "Lucida Sans Unicode", "Fira Mono", Consolas, "Courier New", Courier, monospace, "Times New Roman";
      }

      .box th {
        text-align: left;
        font-size: 16px;
      }
      
      .box tbody.serverEntry {
      	width: 100%;
      	display: contents;
      }

      .box tr.serverEntryOverview {
        height: 52px;
        background-color: var(--black);
        border: 1px solid #666;
        font-size: 16px;
      }

      .box tr.serverEntryOverview.status-none {
        color: var(--secondarylight);
      }

      .box tr.serverEntryOverview.status-prep {
        color: var(--warninglight);
      }

      .box tr.serverEntryOverview.status-hack {
        color: var(--primarylight);
      }

      .box tr.serverEntryOverview td {
        padding-top:8px;
        padding-bottom:8px;
        padding-right:8px;
      }

      .box tr.serverEntryOverview td:first-child {
        padding-left:8px;
        padding-right:0;
      }
      
      .box tr.serverEntryDetails.collapsed {
      	display: none;
      }
    \`));
    `}</style>
);