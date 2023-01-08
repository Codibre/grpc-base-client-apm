import { DefaultGrpcMiddleware } from 'grpc-base-client';
import * as apm from 'elastic-apm-node';

export const apmClientMiddleware: DefaultGrpcMiddleware =
	function apmMiddleware([metadata], method: string) {
		const { currentTransaction } = apm;
		if (currentTransaction) {
			const { ids } = currentTransaction;
			metadata.add('grpc-apm-middleware-trace.id', ids['trace.id']);
			metadata.add('grpc-apm-middleware-transaction.id', ids['transaction.id']);
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
