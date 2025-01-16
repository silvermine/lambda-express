import { isUndefined } from '@silvermine/toolbox';

export default function withDefault<T>(value: T | undefined, defaultValue: T): T {
   if (isUndefined(value)) {
      return defaultValue;
   }

   return value;
}
