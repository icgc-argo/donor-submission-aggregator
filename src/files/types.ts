export type File = {
	donorId: string;
	fileId: string;
	objectId: string;
	repoId: string;
	analysisId: string;
	programId: string;
	firstPublished: string;
	status: string;
	embargoStage: string;
	releaseState: string;
	labels: string[];
};

export enum FileReleaseState {
	PUBLIC = 'PUBLIC',
	RESTRICTED = 'RESTRICTED',
	QUEUED = 'QUEUED',
}

export enum DonorMolecularDataReleaseStatus {
	FULLY_RELEASED = 'FULLY_RELEASED',
	PARTIALLY_RELEASED = 'PARTIALLY_RELEASED',
	NO_RELEASE = 'NO_RELEASE',
}
