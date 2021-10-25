import { DOMcreateElement } from '/src/UI/API/index.js'

const css = String.raw

export const styles = (
    <style>{css`
		.box * {
			font-family: "Lucida Console", "Lucida Sans Unicode", "Fira Mono", Consolas, "Courier New", Courier, monospace, "Times New Roman";
		}
		
		.box th {
        	text-align: left;
        	font-size: 16px;
		}
    `}</style>
);