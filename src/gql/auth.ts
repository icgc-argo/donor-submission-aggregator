/*
 * Copyright (c) 2024 The Ontario Institute for Cancer Research. All rights reserved
 * This program and the accompanying materials are made available under the terms of
 *
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

import { ApolloError, AuthenticationError } from "apollo-server-express";
import { egoTokenUtils } from "external/ego/utils";
import { GraphQLFieldResolver } from "graphql";
import { BaseQueryArguments } from "./ProgramDonorSummary/resolvers/types";
import { GlobalGqlContext } from "./server";
import { RDPC_CODE } from "config";

class UnauthorizedError extends ApolloError {
  constructor(message: string) {
    super(message);
  }
  extensions = {
    code: "UNAUTHORIZED",
  };
}

export const resolveWithProgramAuth = <
  ResolverType = GraphQLFieldResolver<unknown, unknown, unknown>
>(
  resolver: ResolverType,
  gqlResolverArguments: [unknown, BaseQueryArguments, GlobalGqlContext, unknown]
): ResolverType => {
  const [_, args, context] = gqlResolverArguments;
  const { egoToken } = context;
  const {
    getPermissionsFromToken,
    isValidJwt,
    canReadProgramData,
    canReadProgram,
    canReadFromRdpc,
  } = egoTokenUtils;

  const programId = args.programShortName;

  if (egoToken) {
    const permissions = getPermissionsFromToken(egoToken);
    const hasPermission =
      canReadProgram({
        permissions,
        programId,
      }) ||
      canReadProgramData({
        permissions,
        programId,
      }) ||
      canReadFromRdpc({ permissions, rdpcCode: RDPC_CODE });

    const authorized = egoToken && isValidJwt(egoToken) && hasPermission;

    if (authorized) {
      return resolver;
    } else {
      throw new UnauthorizedError("unauthorized");
    }
  } else {
    throw new AuthenticationError("you must be logged in to access this data");
  }
};
