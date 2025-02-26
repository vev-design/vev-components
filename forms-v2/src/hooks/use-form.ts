import { useGlobalStateRef } from '@vev/react';

export function useFormField<T>(
    variableKey: string,
): [T, (value: T, type?: 'add' | 'remove') => void] {
    const [state, stateDispatch] = useGlobalStateRef();

    const { variables } = state.current;
    const value = variables.find((v) => v.key === variableKey)?.value;

    const onChange = (update: T, type: 'add' | 'remove') => {
        if (type) {
            if (type === 'add') {
                update = value ? `${value},${update}` : `${update}`;
            }
            if (type === 'remove') {
                console.log('remove', update);
                const valuesArray = value.split(',').filter((v) => v !== update);
                update = valuesArray.join(',');
            }
        }

        stateDispatch(
            'variables',
            variables.map((v) => (v.key === variableKey ? { ...v, value: update } : v)),
        );
    };

    return [value, onChange];
}
