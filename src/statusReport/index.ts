import express from "express";
import packageJson from "../../package.json";

export default () => {
  let state: {
    isReady: boolean;
    currentProcessing: string[];
  } = {
    isReady: false,
    currentProcessing: []
  };

  const setState = (_state: Partial<typeof state>) => {
    state = {
      ...state,
      ..._state
    };
  };

  const app = express();
  app.get("/status", (req, res) => {
    if (state.isReady) {
      res.send({
        state,
        version: packageJson.version
      });
    }
  });

  return {
    app,
    setReady: (isReady: boolean) => {
      setState({
        isReady
      });
    },
    startProcessingProgram: (programId: string) => {
      if (!state.currentProcessing.includes(programId)) {
        setState({
          currentProcessing: [...state.currentProcessing, programId]
        });
      } else {
        console.error(new Error("detected parallel program"));
      }
    },
    completeProcessingProgram: (programId: string) => {
      setState({
        currentProcessing: state.currentProcessing.filter(
          id => programId !== id
        )
      });
    }
  };
};
