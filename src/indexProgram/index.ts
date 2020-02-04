import donorModel, { MongoDonorDocument } from "donorModel";

const programDonorCollection = async function*(programShortName: string) {
  const pageSize = 500;
  const streamState = {
    currentPage: 0,
    lastPageLength: 0
  };
  do {
    const page = await donorModel
      .find({ programId: programShortName })
      .skip(streamState.currentPage * pageSize)
      .limit(pageSize)
      .exec();
    streamState.lastPageLength = page.length;
    streamState.currentPage++;
    yield page;
  } while (streamState.lastPageLength >= pageSize);
};

const toEsDocument = (mongoDoc: MongoDonorDocument): {} => {
  return {};
};

export default async (programShortName: string) => {
  for await (const page of programDonorCollection(programShortName)) {
    const esDocs = page.map(toEsDocument);
    // console.log("page: ", page);
  }
};
