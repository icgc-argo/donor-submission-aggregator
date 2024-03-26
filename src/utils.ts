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
import { formatISO } from "date-fns";
import logger from "logger";

export const isNotAbsent = (
	value: string | number | boolean | undefined,
): value is string | number | boolean => {
	return value !== null && value !== undefined;
};

export const isNotEmptyString = (value: string | undefined): value is string => {
	return isNotAbsent(value) && value.trim() !== '';
};

/** Date Utils */

export const validateISODate = (dateInput: string | Date) => {
  const date = new Date(dateInput);
  try {
    const result = formatISO(date);
    return !!result;
  } catch (err) {
    logger.error(`Date string can't be used as an ISO string: ${err}`);
    return false;
  }
};

export const convertStringToISODate = (dateInput: string | Date) => {
  const date = new Date(dateInput);
  const result = formatISO(date);
  return new Date(result);
};
