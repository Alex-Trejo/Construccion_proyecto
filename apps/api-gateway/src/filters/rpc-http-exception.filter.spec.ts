import { RpcHttpExceptionFilter } from './rpc-http-exception.filter';
import { HttpException, HttpStatus, Logger } from '@nestjs/common';
import type { ArgumentsHost } from '@nestjs/common';

describe('RpcHttpExceptionFilter', () => {
  let filter: RpcHttpExceptionFilter;
  let mockResponse: any;
  let mockHost: ArgumentsHost;

  beforeEach(() => {
    filter = new RpcHttpExceptionFilter();

    mockResponse = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn(),
    };

    mockHost = {
      switchToHttp: jest.fn().mockReturnValue({
        getResponse: () => mockResponse,
      }),
    } as any;

    jest.spyOn(Logger.prototype, 'error').mockImplementation(() => {});
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should handle standard HttpException', () => {
    const exception = new HttpException('Forbidden', HttpStatus.FORBIDDEN);
    filter.catch(exception, mockHost);

    expect(mockResponse.status).toHaveBeenCalledWith(HttpStatus.FORBIDDEN);
    expect(mockResponse.json).toHaveBeenCalledWith({
      statusCode: HttpStatus.FORBIDDEN,
      message: 'Forbidden',
    });
  });

  it('should handle HttpException with object response', () => {
    const exception = new HttpException({ custom: 'error' }, HttpStatus.BAD_REQUEST);
    filter.catch(exception, mockHost);

    expect(mockResponse.status).toHaveBeenCalledWith(HttpStatus.BAD_REQUEST);
    expect(mockResponse.json).toHaveBeenCalledWith({ custom: 'error' });
  });

  it('should extract simple RPC error', () => {
    const rpcException = { statusCode: 400, message: 'Invalid data' };
    filter.catch(rpcException, mockHost);

    expect(mockResponse.status).toHaveBeenCalledWith(400);
    expect(mockResponse.json).toHaveBeenCalledWith({
      statusCode: 400,
      message: 'Invalid data',
    });
  });

  it('should extract RPC error with array message', () => {
    const rpcException = { status: 400, message: ['Error 1', 'Error 2'] };
    filter.catch(rpcException, mockHost);

    expect(mockResponse.status).toHaveBeenCalledWith(400);
    expect(mockResponse.json).toHaveBeenCalledWith({
      statusCode: 400,
      message: 'Error 1, Error 2',
    });
  });

  it('should default to 500 if RPC error has no status code', () => {
    const rpcException = { message: 'Some server error' };
    filter.catch(rpcException, mockHost);

    expect(mockResponse.status).toHaveBeenCalledWith(HttpStatus.INTERNAL_SERVER_ERROR);
    expect(mockResponse.json).toHaveBeenCalledWith({
      statusCode: HttpStatus.INTERNAL_SERVER_ERROR,
      message: 'Some server error',
    });
  });

  it('should return 500 for non-object exception', () => {
    filter.catch('Just a string error', mockHost);

    expect(mockResponse.status).toHaveBeenCalledWith(HttpStatus.INTERNAL_SERVER_ERROR);
    expect(mockResponse.json).toHaveBeenCalledWith({
      statusCode: HttpStatus.INTERNAL_SERVER_ERROR,
      message: 'Internal server error',
    });
    expect(Logger.prototype.error).toHaveBeenCalled();
  });

  it('should return 500 for object without message', () => {
    filter.catch({ someField: 'value' }, mockHost);

    expect(mockResponse.status).toHaveBeenCalledWith(HttpStatus.INTERNAL_SERVER_ERROR);
    expect(mockResponse.json).toHaveBeenCalledWith({
      statusCode: HttpStatus.INTERNAL_SERVER_ERROR,
      message: 'Internal server error',
    });
  });
  it('should describe circular references safely', () => {
    const circularObj: any = {};
    circularObj.self = circularObj;
    
    filter.catch(circularObj, mockHost);

    expect(Logger.prototype.error).toHaveBeenCalledWith('Excepción no controlada: [object Object]');
  });
});
