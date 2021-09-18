import type { BitBurner as NS } from 'Bitburner'
import { CONSTANT }             from '/src/lib/constants.js'

const files: string[] = [
	'Bitburner.t.js',
	'import.js',
	'api/ControlFlowAPI.js',
	'api/JobAPI.js',
	'api/LogAPI.js',
	'api/ServerAPI.js',
	'classes/BladeBurner/BBAction.js',
	'classes/BladeBurner/BBCity.js',
	'classes/BladeBurner/BBInterfaces.js',
	'classes/BladeBurner/BBSkill.js',
	'classes/Gang/Gang.js',
	'classes/Gang/GangInterfaces.js',
	'classes/Gang/GangMember.js',
	'classes/Gang/GangTask.js',
	'classes/Gang/GangUpgrade.js',
	'classes/Gang/HomeGang.js',
	'classes/Job/Batch.js',
	'classes/Job/Job.js',
	'classes/Job/JobInterfaces.js',
	'classes/Misc/Augmentation.js',
	'classes/Misc/CodingContract.js',
	'classes/Misc/Crime.js',
	'classes/Misc/HackInterfaces.js',
	'classes/Misc/Program.js',
	'classes/Misc/ScriptInterfaces.js',
	'classes/Server/HackableServer.js',
	'classes/Server/PurchasedServer.js',
	'classes/Server/Server.js',
	'classes/Server/ServerInterfaces.js',
	'classes/Sleeve/Sleeve.js',
	'classes/Stock/Stock.js',
	'classes/Stock/StockInterfaces.js',
	'lib/constants.js',
	'lib/names.txt',
	'managers/BladeBurnerManager.js',
	'managers/CorporationManager.js',
	'managers/GangManager.js',
	'managers/HackingManager.js',
	'managers/JobManager.js',
	'managers/Managers.js',
	'managers/SleeveManager.js',
	'managers/StockManager.js',
	'runners/CodingContractRunner.js',
	'runners/ProgramRunner.js',
	'runners/PurchasedServerRunner.js',
	'runners/ServerMapRunner.js',
	'scripts/cleanHome.js',
	'scripts/daemon.js',
	'scripts/executeCrimes.js',
	'scripts/hackingMission.js',
	'scripts/infiltrationHelper.js',
	'scripts/killAll.js',
	'scripts/printServerList.js',
	'scripts/route.js',
	'tools/grow.js',
	'tools/hack.js',
	'tools/Tools.js',
	'tools/weaken.js',
	'util/BladeBurnerUtils.js',
	'util/CodingContractUtils.js',
	'util/CrimeUtils.js',
	'util/CycleUtils.js',
	'util/GangUtils.js',
	'util/HackUtils.js',
	'util/Heuristics.js',
	'util/PlayerUtils.js',
	'util/SerializationUtils.js',
	'util/ServerUtils.js',
	'util/ToolUtils.js',
	'util/Utils.js',
]

/*
 * This will import all files listed in importFiles.
 */
export async function main(ns: NS) {

	// TODO: First import the import script and run it seperately

	const filesImported = await importFiles(ns)
	ns.tprint('='.repeat(20))
	if (filesImported) {
		ns.tprint('You have succesfully downloaded the scripts.')
		ns.tprint(`You have installed these in the ${CONSTANT.LOCAL_FOLDER} directory.`)
	} else {
		ns.tprint(
			'You had some issues downloading files, please check your scripts and config.',
		)
	}
}

async function importFiles(ns: NS) {
	if (!files) {
		throw new Error('No files found.')
	}

	const requests: Promise<{ file: string, result: boolean }>[] = files.map(async (file) => {
			const remoteFileName     = `${CONSTANT.ROOT_URL}/${CONSTANT.REMOTE_FOLDER}/${file}`
			const response: Response = await fetch(remoteFileName)
			if (!response.ok) return { file, result: false }
			const localFileName: string = `/${CONSTANT.LOCAL_FOLDER}/${file}`
			ns.write(localFileName, await response.text(), 'w')
			return {
				file,
				result: true,
			}
		},
	)

	const responses: { file: string, result: boolean }[] = await Promise.all(requests)

	let filesImported = true
	for (const response of responses) {
		filesImported = filesImported && response.result
		ns.tprint(`File: ${response.file}: ${response.result ? '✔️' : '❌'}`)
	}

	return filesImported
}