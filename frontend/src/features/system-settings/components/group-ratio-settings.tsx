import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { IconDeviceFloppy } from '@tabler/icons-react';
import { Button } from '@/components/ui/button';
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Textarea } from '@/components/ui/textarea';
import { toast } from 'sonner';
import { useQuerySystemSetting, useUpdateSystemSetting } from '../data/settings';

const formSchema = z.object({
    value: z.string().min(1, 'Value is required'),
});

type FormValues = z.infer<typeof formSchema>;

export function GroupRatioSettings() {
    const [isEditing, setIsEditing] = useState(false);

    const { data, isLoading } = useQuerySystemSetting('group_ratio');
    const updateMutation = useUpdateSystemSetting();

    const form = useForm<FormValues>({
        resolver: zodResolver(formSchema),
        defaultValues: {
            value: '',
        },
    });

    // Update form when data is loaded
    useEffect(() => {
        if (data?.settings?.[0]?.value) {
            form.reset({ value: JSON.stringify(data.settings[0].value, null, 2) });
        } else {
            // Default value
            form.reset({ value: JSON.stringify({ default: 2, vip: 1, svip: 0.5 }, null, 2) });
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [data]);

    const onSubmit = async (values: FormValues) => {
        try {
            // Parse JSON
            const parsedValue = JSON.parse(values.value);

            // Validate that all values are numbers
            for (const [key, val] of Object.entries(parsedValue)) {
                if (typeof val !== 'number') {
                    toast.error(`Value for "${key}" must be a number`);
                    return;
                }
            }

            await updateMutation.mutateAsync({
                key: 'group_ratio',
                value: parsedValue,
                description: 'Group multiplier ratios for billing',
            });

            toast.success('Group ratio settings updated successfully');
            setIsEditing(false);
        } catch (error) {
            if (error instanceof SyntaxError) {
                toast.error('Invalid JSON format');
            } else {
                toast.error(error instanceof Error ? error.message : 'Failed to update settings');
            }
        }
    };

    if (isLoading) {
        return <div className="p-4">Loading...</div>;
    }

    return (
        <div className="space-y-4">
            <div>
                <h3 className="text-lg font-semibold">分组倍率</h3>
                <p className="text-sm text-muted-foreground">
                    分组倍率设置，可以在此处新增分组或修改现有分组的倍率。格式为 JSON 字符串，例如：{'{'}
                    "vip": 0.5, "test": 1{'}'}, 表示 vip 分组的倍率为 0.5，test 分组的倍率为 1
                </p>
            </div>

            <Form {...form}>
                <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                    <FormField
                        control={form.control}
                        name="value"
                        render={({ field }) => (
                            <FormItem>
                                <FormLabel>Group Ratio JSON</FormLabel>
                                <FormControl>
                                    <Textarea
                                        {...field}
                                        className="font-mono min-h-[200px]"
                                        placeholder='{"default": 2, "vip": 1, "svip": 0.5}'
                                        disabled={!isEditing}
                                    />
                                </FormControl>
                                <FormDescription>
                                    Enter group ratios as JSON. Each key is a group name, and each value is the
                                    multiplier rate.
                                </FormDescription>
                                <FormMessage />
                            </FormItem>
                        )}
                    />
                </form>
            </Form>

            <div className="flex gap-2">
                {!isEditing ? (
                    <Button type="button" onClick={() => setIsEditing(true)}>
                        Edit
                    </Button>
                ) : (
                    <>
                        <Button
                            type="button"
                            onClick={form.handleSubmit(onSubmit)}
                            disabled={updateMutation.isPending}
                        >
                            <IconDeviceFloppy className="mr-2 h-4 w-4" />
                            {updateMutation.isPending ? 'Saving...' : 'Save'}
                        </Button>
                        <Button
                            type="button"
                            variant="outline"
                            onClick={() => {
                                setIsEditing(false);
                                // Reset to current data values
                                if (data?.settings?.[0]?.value) {
                                    form.reset({ value: JSON.stringify(data.settings[0].value, null, 2) });
                                } else {
                                    form.reset({ value: JSON.stringify({ default: 2, vip: 1, svip: 0.5 }, null, 2) });
                                }
                            }}
                        >
                            Cancel
                        </Button>
                    </>
                )}
            </div>
        </div>
    );
}
