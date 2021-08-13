import type { BitBurner as NS } from 'Bitburner'

const excludedFiles: string[] = [
	'/src/lib/constants.js',
	'import.js',
]

const excludedExtensions: string[] = [
	'lit',
	'msg',
	'script',
	'exe',
]

export async function main(ns: NS) {

	const host: string = ns.getHostname()
	if (host !== 'home') {
		throw new Error('Execute script from home.')
	}

	const files: string[] = ns.ls(host)
	                          .filter(file => !excludedFiles.includes(file))
	                          .filter(file => {
		                          const extension = file.split('.').pop()
		                          if (!extension) {
			                          return true
		                          }
		                          return !excludedExtensions.includes(extension)
	                          })

	files.forEach(file => ns.rm(file))
}