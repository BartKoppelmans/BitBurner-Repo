import type { BitBurner as NS } from 'Bitburner'
import { CONSTANT }             from '/src/lib/constants.js'

const files: string[] = [
	'Bitburner.t.js',
	'import.js',
	'api/CodingContractAPI.js',
	'api/ControlFlowAPI.js',
	'api/JobAPI.js',
	'api/LogAPI.js',
	'api/ProgramAPI.js',
	'api/ServerAPI.js',
	'classes/Job/BatchJob.js',
	'classes/Job/Job.js',
	'classes/Job/JobInterfaces.js',
	'classes/Misc/CodingContract.js',
	'classes/Misc/Crime.js',
	'classes/Misc/HackInterfaces.js',
	'classes/Misc/Program.js',
	'classes/Misc/ScriptInterfaces.js',
	'classes/Server/HackableServer.js',
	'classes/Server/PurchasedServer.js',
	'classes/Server/Server.js',
	'classes/Server/ServerInterfaces.js',
	'lib/constants.js',
	'managers/JobManager.js',
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
	'util/CodingContractUtils.js',
	'util/CrimeUtils.js',
	'util/CycleUtils.js',
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

	let filesImported = true
	for (const file of files) {
		const remoteFileName = `${CONSTANT.ROOT_URL}/${CONSTANT.REMOTE_FOLDER}/${file}`
		const result         = await ns.wget(remoteFileName, `/${CONSTANT.LOCAL_FOLDER}/${file}`)
		filesImported        = filesImported && result
		ns.tprint(`File: ${file}: ${result ? '✔️' : '❌'}`)
	}

	return filesImported
}