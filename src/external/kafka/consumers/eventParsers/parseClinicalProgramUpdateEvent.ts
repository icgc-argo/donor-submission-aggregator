import { isArray, isObjectLike, isString } from 'lodash';
import logger from 'logger';

type ClinicalProgramUpdateEvent = {
	programId: string;
	donorIds?: string[];
};

const isProgramUpdateEvent = (input: unknown): input is ClinicalProgramUpdateEvent => {
	if (input && isObjectLike(input)) {
		const event = input as ClinicalProgramUpdateEvent;
		return (
			isString(event.programId) &&
			// donorIds is undefined or an array with all strings
			(event.donorIds === undefined ||
				(isArray(event.donorIds) && (event.donorIds as any[]).every((i) => isString(i))))
		);
	}
	return false;
};

const parseClinicalProgramUpdateEvent = (str: string): ClinicalProgramUpdateEvent => {
	const obj = JSON.parse(str);
	if (isProgramUpdateEvent(obj)) {
		return obj;
	} else {
		logger.warn(
			"Failed to process message, missing programId, it's either not a CLINICAL update event or message has invalid/missing fields.",
		);
		return { programId: '' };
	}
};

export default parseClinicalProgramUpdateEvent;
