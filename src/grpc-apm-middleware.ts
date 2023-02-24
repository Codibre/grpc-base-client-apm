import { DefaultGrpcMiddleware } from 'grpc-base-client';
import * as apm from 'elastic-apm-node';
import { ServerDuplexStream } from '@grpc/grpc-js';

const TRACE_PARENT_ID = 'elastic-apm-traceparent';

export const gprcApmClientMiddleware: DefaultGrpcMiddleware =
	function gprcApmClientMiddleware([metadata], method: string) {
		const { currentTraceparent } = apm;
		if (currentTraceparent) {
			metadata.add(TRACE_PARENT_ID, currentTraceparent);
			const span = apm.startSpan(`grpc call ${method}`);

			return span
				? {
						onEnd: (error) => {
							span.setOutcome(error ? 'failure' : 'success');
							span.end();
						},
				  }
				: undefined;
		}
	};

export function grpcServerUnaryWrapper<P, R>(
	stream: ServerDuplexStream<P, R>,
	method: string,
) {
	const { metadata } = stream;
	const [transactionId] = metadata.get(TRACE_PARENT_ID);
	const span = apm.startTransaction(`grpc call ${method}`, {
		childOf: transactionId?.toString(),
	});

	return span
		? {
				onEnd: (error: unknown) => {
					span.setOutcome(error ? 'failure' : 'success');
					span.end();
				},
		  }
		: undefined;
}
