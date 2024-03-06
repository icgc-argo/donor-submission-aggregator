export const isNotAbsent = (
	value: string | number | boolean | undefined,
): value is string | number | boolean => {
	return value !== null && value !== undefined;
};

export const isNotEmptyString = (value: string | undefined): value is string => {
	return isNotAbsent(value) && value.trim() !== '';
};
