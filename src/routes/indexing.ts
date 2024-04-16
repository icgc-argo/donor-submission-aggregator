/*
 * Copyright (c) 2024 The Ontario Institute for Cancer Research. All rights reserved
 *
 * This program and the accompanying materials are made available under the terms of
 * the GNU Affero General Public License v3.0. You should have received a copy of the
 * GNU Affero General Public License along with this program.
 *  If not, see <http://www.gnu.org/licenses/>.
 *
 * THIS SOFTWARE IS PROVIDED BY THE COPYRIGHT HOLDERS AND CONTRIBUTORS "AS IS" AND ANY
 * EXPRESS OR IMPLIED WARRANTIES, INCLUDING, BUT NOT LIMITED TO, THE IMPLIED WARRANTIES
 * OF MERCHANTABILITY AND FITNESS FOR A PARTICULAR PURPOSE ARE DISCLAIMED. IN NO EVENT
 * SHALL THE COPYRIGHT HOLDER OR CONTRIBUTORS BE LIABLE FOR ANY DIRECT, INDIRECT,
 * INCIDENTAL, SPECIAL, EXEMPLARY, OR CONSEQUENTIAL DAMAGES (INCLUDING, BUT NOT LIMITED
 * TO, PROCUREMENT OF SUBSTITUTE GOODS OR SERVICES; LOSS OF USE, DATA, OR PROFITS;
 * OR BUSINESS INTERRUPTION) HOWEVER CAUSED AND ON ANY THEORY OF LIABILITY, WHETHER
 * IN CONTRACT, STRICT LIABILITY, OR TORT (INCLUDING NEGLIGENCE OR OTHERWISE) ARISING IN
 * ANY WAY OUT OF THE USE OF THIS SOFTWARE, EVEN IF ADVISED OF THE POSSIBILITY OF SUCH DAMAGE.
 */

import { RDPC_URL } from "config";
import express from "express";
import { queueProgramUpdateEvent } from "external/kafka/producers/programQueueProducer";
import logger from "logger";
import { KnownEventType } from "processors/types";

const indexingRouter = express.Router({ mergeParams: true });

indexingRouter.post("/program/:program_id", async (req, res) => {
  const programId = req.params.program_id;
  try {
    logger.info(
      `received request to index program ${programId}, validating program id...`
    );
    // validate programId:
    const regex = new RegExp(
      "^[A-Z0-9][-_A-Z0-9]{2,7}[-](([A-Z][A-Z])|(INTL))$"
    );
    const found = programId.match(regex);

    if (!found) {
      return res
        .status(400)
        .send(
          `ProgramId (${programId}) is invalid, please enter a valid programId.`
        );
    } else {
      await queueProgramUpdateEvent({
        programId: programId,
        type: KnownEventType.SYNC,
        rdpcGatewayUrls: [RDPC_URL],
      });
      logger.info(`Program ${programId} has been queued for indexing.`);
      return res
        .status(200)
        .send(`Program ${programId} has been queued for indexing.`);
    }
  } catch (error) {
    logger.error("Error in processing index program request: " + error);
    return res
      .status(500)
      .send(`Failed to queue program ${programId} for indexing.`);
  }
});

export default indexingRouter;
