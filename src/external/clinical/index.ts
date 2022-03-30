/*
 * Copyright (c) 2020 The Ontario Institute for Cancer Research. All rights reserved
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

import _ from "lodash";
import fetch from "node-fetch";
import { CLINICAL_URL } from "../../config";
import logger from "../../logger";
import { getEgoToken } from "../ego";
import { ClinicalDonor } from "./types";

export async function fetchDonor(programId: string, donorId: string) {
  try {
    logger.debug(
      `Fetcing clinical data for ${JSON.stringify({ programId, donorId })}`
    );
    const response = await fetch(
      `${CLINICAL_URL}/clinical/program/${programId}/donor/${donorId}`,
      {
        headers: {
          Authorization: `Bearer ${await getEgoToken("dcc")}`,
        },
      }
    );
    const donor = await response.json();
    return donor;
  } catch (e) {
    logger.warn(
      `Error fetching clinical data for ${JSON.stringify({
        programId,
        donorId,
      })}`,
      <Error>e
    );
    return undefined;
  }
}

export async function* fetchAllDonorsForProgram(
  programId: string
): AsyncGenerator<ClinicalDonor> {
  logger.debug(`Begining fetch of all donors for program: ${programId}`);

  const logFrequency = 100;

  const response = await fetch(
    `${CLINICAL_URL}/clinical/program/${programId}/donors`,
    {
      headers: {
        Authorization: `Bearer ${await getEgoToken("dcc")}`,
      },
    }
  );
  // Expected response is json-lines: new line delimited JSON documents that will be streamed in chunks
  // The next section turns the body response stream into an async iterator
  let donorCount = 0;
  let unprocessedResponse = "";
  for await (let chunk of response.body) {
    let leftovers = "";
    unprocessedResponse += chunk;
    const splitResponse = unprocessedResponse.split("\n");
    const donors = splitResponse
      .filter((chunk) => {
        // occasionally in testing an empty item was found in the split response so lets filter those out.
        return !_.isEmpty(chunk);
      })
      .map((chunk, index, array) => {
        try {
          return JSON.parse(chunk);
        } catch (err) {
          if (err instanceof SyntaxError) {
            // In practice, the response stream can include partial messages, likely because the packet size is smaller than the donors
            // So we will capture the partial response and combine it with the next message.
            leftovers += chunk;
            return undefined;
          } else {
            // Should not see this, only Syntax Errors from JSON parsing incomplete objects. Adding this just to capture any strange results.
            logger.error(
              `Unexpected error parsing data returned by Clinical API. ${err}`
            );
            throw err;
          }
        }
      })
      .filter((content) => content !== undefined);
    for (const donor of donors) {
      yield donor;
      donorCount++;
      if (donorCount % logFrequency === 0) {
        logger.debug(
          `Received clinical data for ${donorCount} donors of program ${programId}`
        );
      }
    }
    unprocessedResponse = leftovers;
  }

  logger.debug(`Retrieved ${donorCount} donors for program: ${programId}`);
  if (!_.isEmpty(unprocessedResponse)) {
    logger.warn(
      `Part of the API message was unprocessed! - ${unprocessedResponse}`
    );
  }
  return;
}
