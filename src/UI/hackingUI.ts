import type { BitBurner as NS } from 'Bitburner'
import { createBox }            from '/src/UI/API/box.js'

export async function main(ns: NS) {
	createBox('test', '<p>Test</p>');
}