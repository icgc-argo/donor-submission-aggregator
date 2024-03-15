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

import { ApolloServer, ContextFunction } from "@apollo/server";
import { StandaloneServerContextFunctionArgument } from "@apollo/server/standalone";
import { EgoJwtData } from "@icgc-argo/ego-token-utils/dist/common";
import schema from "./schema";

export type GlobalGqlContext = {
  egoToken: string;
  Authorization: string;
  userJwtData: EgoJwtData | undefined;
};

export const gqlContext: ContextFunction<
  [StandaloneServerContextFunctionArgument],
  GlobalGqlContext
> = async ({ req, res }) => {
  // Get the user token from the headers.
  const authHeader = req.headers.authorization;
  let userJwtData: EgoJwtData | undefined = undefined;
  try {
    if (authHeader) {
      const jwt = authHeader.replace("Bearer ", "");
    }
  } catch (err) {
    userJwtData = undefined;
  }
  // Add the user to the context
  return {
    isUserRequest: true,
    egoToken: (authHeader || "").split("Bearer ").join(""),
    Authorization:
      `Bearer ${(authHeader || "").replace(/^Bearer[\s]*!/, "")}` || "",
    userJwtData,
    dataLoaders: {},
  };
};

export const apolloServer = new ApolloServer({
  schema,
});
