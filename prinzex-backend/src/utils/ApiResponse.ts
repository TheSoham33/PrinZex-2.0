/**
 * Standard success envelope for every endpoint.
 *
 *   res.status(200).json(new ApiResponse(200, payload, 'Stores fetched'));
 */
export class ApiResponse<T> {
  statusCode: number;
  data: T;
  message: string;
  success: boolean;

  constructor(statusCode: number, data: T, message = 'Success') {
    this.statusCode = statusCode;
    this.data = data;
    this.message = message;
    this.success = statusCode < 400;
  }
}
