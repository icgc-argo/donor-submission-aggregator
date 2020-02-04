import donorModel, { MongoDonorDocument } from "../donorModel";

type StreamState = {
  currentPage: number;
  lastPageLength: number;
};

const programDonorStream = async function*(
  programShortName: string,
  config?: {
    chunkSize?: number;
    state?: StreamState;
  }
): AsyncGenerator<MongoDonorDocument[]> {
  const chunkSize = config?.chunkSize || 1000;
  const streamState: StreamState = {
    currentPage: config?.state?.currentPage || 0,
    lastPageLength: config?.state?.lastPageLength || chunkSize
  };
  while (streamState.lastPageLength >= chunkSize) {
    const page = await donorModel
      .find({ programId: programShortName })
      .skip(streamState.currentPage * chunkSize)
      .limit(chunkSize)
      .exec();
    streamState.lastPageLength = page.length;
    streamState.currentPage++;
    yield page;
  }
};

export default programDonorStream;
