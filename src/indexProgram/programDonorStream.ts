import donorModel, { MongoDonorDocument } from "../donorModel";

type StreamState = {
  currentPage: number;
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
    currentPage: config?.state?.currentPage || 0
  };
  while (true) {
    const page = await donorModel()
      .find({ programId: programShortName })
      .skip(streamState.currentPage * chunkSize)
      .limit(chunkSize)
      .exec();
    streamState.currentPage++;
    if (page.length) {
      yield page;
    } else {
      break;
    }
  }
};

export default programDonorStream;
