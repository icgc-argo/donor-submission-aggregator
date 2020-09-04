import express from "express";
import logger from "logger";
import path from "path";
import { promises } from "fs";
import { APP_DIR } from "config";

const packageJson = promises
  .readFile(path.resolve(APP_DIR, "../package.json"), "utf-8")
  .then((result) => JSON.parse(result));

const createStatusReporter = (app: ReturnType<typeof express>) => (
  endpoint: string
) => {
  let state: {
    isReady: boolean;
    processingProgram: string[];
  } = {
    isReady: false,
    processingProgram: [],
  };

  const setState = (_state: Partial<typeof state>) => {
    state = {
      ...state,
      ..._state,
    };
  };

  app.get(endpoint, async (req, res) => {
    if (state.isReady) {
      res.send({
        state,
        version: (await packageJson).version,
      });
    } else {
      res.status(500).send("not ready");
    }
  });

  return {
    setReady: (isReady: boolean) => {
      setState({
        isReady,
      });
    },
    startProcessingProgram: (programId: string) => {
      if (!state.processingProgram.includes(programId)) {
        setState({
          processingProgram: [...state.processingProgram, programId],
        });
        logger.profile(programId);
      } else {
        logger.error(new Error(`detected parallel program ${programId}`));
      }
    },
    endProcessingProgram: (programId: string) => {
      logger.profile(programId);
      setState({
        processingProgram: state.processingProgram.filter(
          (id) => programId !== id
        ),
      });
    },
  };
};
export default createStatusReporter;
export type StatusReporter = ReturnType<
  ReturnType<typeof createStatusReporter>
>;
