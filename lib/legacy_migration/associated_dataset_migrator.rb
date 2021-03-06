class AssociatedDatasetMigrator < AbstractMigrator
  class << self
    def prerequisites
      WorkspaceMigrator.migrate
      DatabaseObjectMigrator.migrate
      ChorusViewMigrator.migrate
    end

    def classes_to_validate
      [AssociatedDataset]
    end

    def migrate
      prerequisites

      Legacy.connection.exec_query("
      INSERT INTO associated_datasets(
        legacy_id,
        dataset_id,
        workspace_id,
        created_at,
        updated_at
      ) SELECT
        edc_dataset.id,
        datasets.id,
        workspaces.id,
        created_tx_stamp,
        last_updated_tx_stamp
      FROM edc_dataset
      INNER JOIN datasets
        ON datasets.legacy_id = normalize_key(edc_dataset.composite_id)
      INNER JOIN workspaces
        ON edc_dataset.workspace_id = workspaces.legacy_id
      WHERE edc_dataset.type = 'SOURCE_TABLE'
      AND edc_dataset.is_deleted = 'f'
      AND edc_dataset.id NOT IN (SELECT legacy_id FROM associated_datasets);
      ")

      Legacy.connection.exec_query("
      INSERT INTO associated_datasets(
        legacy_id,
        dataset_id,
        workspace_id,
        created_at,
        updated_at
      ) SELECT
        edc_dataset.id,
        datasets.id,
        workspaces.id,
        created_tx_stamp,
        last_updated_tx_stamp
      FROM edc_dataset
      INNER JOIN datasets
        ON datasets.legacy_id = normalize_key(edc_dataset.composite_id)
        AND edc_dataset.workspace_id = datasets.edc_workspace_id
      INNER JOIN workspaces
        ON edc_dataset.workspace_id = workspaces.legacy_id
      WHERE edc_dataset.is_deleted = 'f'
      AND edc_dataset.type = 'CHORUS_VIEW'
      AND edc_dataset.id NOT IN (SELECT legacy_id FROM associated_datasets);
      ")
    end
  end
end