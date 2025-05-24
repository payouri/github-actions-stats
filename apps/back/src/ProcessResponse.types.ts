export type ProcessResponse<T> = T extends void | undefined
  ?
      | {
          hasFailed: false;
        }
      | {
          hasFailed: true;
          error: Error;
        }
  :
      | {
          hasFailed: false;
          data: T;
        }
      | {
          hasFailed: true;
          error: Error;
        };
