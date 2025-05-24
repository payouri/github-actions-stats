import { StrictMode, Suspense } from "react";

const App = () => {
	return (
		<StrictMode>
			<Suspense fallback="loading">
				<div>Hello World</div>
			</Suspense>
		</StrictMode>
	);
};

export default App;
