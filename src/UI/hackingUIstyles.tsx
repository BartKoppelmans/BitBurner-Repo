import { DOMcreateElement } from '/src/UI/API/index.js'

const css = String.raw

export const styles = (
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

		.box tr.serverEntry {
			height: 52px; 
			background-color: #222;
			border: 1px solid #666;
			font-size: 16px;
		}
		
		.box tr.serverEntry.status-none {
			color: #AAA;
		}
		
		.box tr.serverEntry.status-prep {
			color: #0f3;
		}
		
		.box tr.serverEntry.status-hack {
			color: #0f3;
		}
		
		.box tr.serverEntry td {
		  padding-top:8px;
		  padding-bottom:8px;
		  padding-right:8px;   
		}
		
		.box tr.serverEntry td:first-child {
		  padding-left:8px;
		  padding-right:0;
		}
    `}</style>
);