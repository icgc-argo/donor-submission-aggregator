import express from "express";
import packageJson from "../../package.json";
import logger from "logger";

export default (app: ReturnType<typeof express>) => (endpoint: string) => {
  let state: {
    isReady: boolean;
    processingProgram: string[];
  } = {
    isReady: false,
    processingProgram: []
  };

  const setState = (_state: Partial<typeof state>) => {
    state = {
      ...state,
      ..._state
    };
  };

  app.get(endpoint, (req, res) => {
    if (state.isReady) {
      res.send({
        state,
        version: packageJson.version
      });
    } else {
      res.status(500).send("not ready");
    }
  });

  return {
    setReady: (isReady: boolean) => {
      setState({
        isReady
      });
    },
    startProcessingProgram: (programId: string) => {
      if (!state.processingProgram.includes(programId)) {
        setState({
          processingProgram: [...state.processingProgram, programId]
        });
        logger.profile(programId);
      } else {
        logger.error(new Error("detected parallel program"));
      }
    },
    endProcessingProgram: (programId: string) => {
      logger.profile(programId);
      setState({
        processingProgram: state.processingProgram.filter(
          id => programId !== id
        )
      });
    }
  };
};
