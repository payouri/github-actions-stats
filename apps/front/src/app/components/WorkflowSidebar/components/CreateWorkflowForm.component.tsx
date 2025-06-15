import { upsertWorkflowProcedureInputSchema } from "@github-actions-stats/workflow-client/src/procedures/workflow.procedures";
import { zodResolver } from "@hookform/resolvers/zod";
import { Button, Flex, Text, TextField } from "@radix-ui/themes";
import { Label } from "radix-ui";
import type { FC } from "react";
import { useForm } from "react-hook-form";

export const CreateWorkflowForm: FC<{
	isCreatingWorkflow: boolean;
	onCreateWorkflow: (params: {
		workflowId: number;
		githubOwner: string;
		githubRepository: string;
	}) => Promise<
		| {
				status: "success";
		  }
		| {
				status: "failed";
				message: string;
		  }
	>;
}> = ({ isCreatingWorkflow, onCreateWorkflow }) => {
	const { register, handleSubmit, subscribe } = useForm({
		resolver: zodResolver(upsertWorkflowProcedureInputSchema),
	});

	return (
		<form onSubmit={handleSubmit(onCreateWorkflow)}>
			<Flex direction="column" gap="3">
				<Label.Root>
					<Text as="div" size="2" mb="1" weight="bold">
						Organization
					</Text>
					<TextField.Root
						{...register("githubOwner", {
							required:
								!upsertWorkflowProcedureInputSchema.shape.githubOwner.isOptional(),
							disabled: isCreatingWorkflow,
						})}
						placeholder="e.g. org-name"
					/>
				</Label.Root>
				<Label.Root>
					<Text as="div" size="2" mb="1" weight="bold">
						Repository
					</Text>
					<TextField.Root
						{...register("githubRepository", {
							required:
								!upsertWorkflowProcedureInputSchema.shape.githubRepository.isOptional(),
							disabled: isCreatingWorkflow,
						})}
						placeholder="e.g. my-repo"
					/>
				</Label.Root>
				<Label.Root>
					<Text as="div" size="2" mb="1" weight="bold">
						Workflow Id
					</Text>
					<TextField.Root
						{...register("workflowId", {
							required:
								!upsertWorkflowProcedureInputSchema.shape.workflowId.isOptional(),
							disabled: isCreatingWorkflow,
						})}
						type="number"
						placeholder="e.g. 213131313"
					/>
				</Label.Root>
				<Button
					loading={isCreatingWorkflow}
					type="submit"
					variant="solid"
					size="2"
				>
					Create Workflow
				</Button>
			</Flex>
		</form>
	);
};
