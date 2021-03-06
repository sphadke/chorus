require 'spec_helper'

describe Dataset do
  let(:gpdb_instance) { gpdb_instances(:owners) }
  let(:account) { gpdb_instance.owner_account }
  let(:schema) { gpdb_schemas(:default) }
  let(:other_schema) { gpdb_schemas(:other_schema) }
  let(:datasets_sql) { Dataset::Query.new(schema).tables_and_views_in_schema.to_sql }
  let(:dataset) { datasets(:table) }
  let(:source_table) { datasets(:source_table) }
  let(:dataset_view) { datasets(:view) }

  describe "associations" do
    it { should belong_to(:schema) }
    it { should have_many(:imports) }
  end

  describe "workspace association" do
    let(:workspace) { workspaces(:public) }

    it "can be bound to workspaces" do
      source_table.bound_workspaces.should include workspace
    end
  end

  describe "validations" do
    it { should validate_presence_of :name }

    it "validates uniqueness of name in the database" do
      duplicate_dataset = GpdbTable.new
      duplicate_dataset.schema = dataset.schema
      duplicate_dataset.name = dataset.name
      expect {
        duplicate_dataset.save!(:validate => false)
      }.to raise_error(ActiveRecord::RecordNotUnique)
    end

    it "does not bother validating uniqueness of name in the database if the record is deleted" do
      duplicate_dataset = GpdbTable.new
      duplicate_dataset.schema = dataset.schema
      duplicate_dataset.name = dataset.name
      duplicate_dataset.deleted_at = Time.now
      duplicate_dataset.save(:validate => false).should be_true
    end

    it "validates uniqueness of name, scoped to schema id" do
      duplicate_dataset = GpdbTable.new
      duplicate_dataset.schema = dataset.schema
      duplicate_dataset.name = dataset.name
      duplicate_dataset.should have_at_least(1).error_on(:name)
      duplicate_dataset.schema = other_schema
      duplicate_dataset.should have(:no).errors_on(:name)
    end

    it "validates uniqueness of name, scoped to type" do
      duplicate_dataset = ChorusView.new
      duplicate_dataset.name = dataset.name
      duplicate_dataset.schema = dataset.schema
      duplicate_dataset.should have(:no).errors_on(:name)
    end

    describe "default scope" do
      it "does not contain deleted datasets" do
        deleted_view = ChorusView.create!({:deleted_at => Time.now, :schema_id => schema.id, :name => "deleted-table"}, :without_protection => true)
        Dataset.all.should_not include(deleted_view)
      end
    end

    it "validate uniqueness of name, scoped to deleted_at" do
      duplicate_dataset = GpdbTable.new
      duplicate_dataset.name = dataset.name
      duplicate_dataset.schema = dataset.schema
      duplicate_dataset.should have_at_least(1).error_on(:name)
      duplicate_dataset.deleted_at = Time.now
      duplicate_dataset.should have(:no).errors_on(:name)
    end
  end

  describe ".find_and_verify_in_source", :database_integration => true do
    let(:account) { InstanceIntegration.real_gpdb_account }
    let(:schema) { GpdbSchema.find_by_name('test_schema') }
    let(:rails_only_table) { GpdbTable.find_by_name('rails_only_table') }
    let(:dataset) { GpdbTable.find_by_name('base_table1') }

    context "when it exists in the source database" do
      it "should return the dataset" do
        described_class.find_and_verify_in_source(dataset.id, account.owner).should == dataset
      end
    end

    context "when the dataset has weird characters" do
      let(:dataset) { GpdbTable.find_by_name(%q{7_`~!@#$%^&*()+=[]{}|\;:',<.>/?}) }

      it "still works" do
        described_class.find_and_verify_in_source(dataset.id, account.owner).should == dataset
      end
    end

    context "when it does not exist in the source database" do
      before do
        GpdbTable.create!({:name => 'rails_only_table', :schema => schema}, :without_protection => true)
      end

      it "should raise ActiveRecord::RecordNotFound exception" do
        expect { described_class.find_and_verify_in_source(rails_only_table.id, account.owner) }.to raise_error(ActiveRecord::RecordNotFound)
      end

      after do
        GpdbTable.find_by_name(rails_only_table.name).destroy
      end
    end
  end

  describe ".with_name_like" do
    it "matches anywhere in the name, regardless of case" do
      dataset.update_attributes!({:name => "amatCHingtable"}, :without_protection => true)

      Dataset.with_name_like("match").count.should == 1
      Dataset.with_name_like("MATCH").count.should == 1
    end

    it "returns all objects if name is not provided" do
      Dataset.with_name_like(nil).count.should == Dataset.count
    end
  end

  describe ".filter_by_name" do
    let(:second_dataset) {
      GpdbTable.new({:name => 'rails_only_table', :schema => schema}, :without_protection => true)
    }
    let(:dataset_list) {
      [dataset, second_dataset]
    }

    it "matches anywhere in the name, regardless of case" do
      dataset.update_attributes!({:name => "amatCHingtable"}, :without_protection => true)

      Dataset.filter_by_name(dataset_list, "match").count.should == 1
      Dataset.filter_by_name(dataset_list, "MATCH").count.should == 1
    end

    it "returns all objects if name is not provided" do
      Dataset.filter_by_name(dataset_list, nil).count.should == dataset_list.count
    end
  end

  context ".refresh" do
    context "refresh once, without mark_stale flag" do
      before do
        stub_gpdb(account, datasets_sql => [
            {'type' => "r", "name" => dataset.name, "master_table" => 't'},
            {'type' => "v", "name" => "new_view", "master_table" => 'f'},
            {'type' => "r", "name" => "new_table", "master_table" => 't'}
        ])
      end

      it "creates new copies of the datasets in our db" do
        Dataset.refresh(account, schema)
        new_table = schema.datasets.find_by_name('new_table')
        new_view = schema.datasets.find_by_name('new_view')
        new_table.should be_a GpdbTable
        new_table.master_table.should be_true
        new_view.should be_a GpdbView
        new_view.master_table.should be_false
      end

      it "returns the list of datasets" do
        datasets = Dataset.refresh(account, schema)
        datasets.map(&:name).should match_array(['table', 'new_table', 'new_view'])
      end

      context "when trying to create a duplicate record" do
        let(:duped_dataset) { Dataset.new({:name => dataset.name, :schema_id => schema.id}, :without_protection => true) }
        before do
          stub.proxy(GpdbTable).find_or_initialize_by_name_and_schema_id(anything, anything) do |table|
            table.persisted? ? duped_dataset : table
          end
        end

        it "keeps going when caught by rails validations" do
          expect { Dataset.refresh(account, schema) }.to change { GpdbTable.count }.by(1)
          schema.datasets.find_by_name('new_table').should be_present
          schema.datasets.find_by_name('new_view').should be_present
        end

        it "keeps going when not caught by rails validations" do
          mock(duped_dataset).save! { raise ActiveRecord::RecordNotUnique.new("boooo!", Exception.new) }

          expect { Dataset.refresh(account, schema) }.to change { GpdbTable.count }.by(1)
          schema.datasets.find_by_name('new_table').should be_present
          schema.datasets.find_by_name('new_view').should be_present
        end

        it "returns the list of datasets without duplicates" do
          mock(duped_dataset).save! { raise ActiveRecord::RecordInvalid.new(duped_dataset) }

          datasets = Dataset.refresh(account, schema)
          datasets.size.should == 2
          datasets.map(&:name).should match_array(['new_table', 'new_view'])
        end
      end

      it "does not re-create datasets that already exist in our database" do
        Dataset.refresh(account, schema)
        lambda {
          Dataset.refresh(account, schema)
        }.should_not change(Dataset, :count)
      end

      it "does not reindex unmodified datasets" do
        Dataset.refresh(account, schema)
        any_instance_of(Dataset) do |dataset|
          dont_allow(dataset).solr_index
        end
        Dataset.refresh(account, schema)
      end
    end

    context "with stale records that now exist" do
      before do
        dataset.update_attributes!({:stale_at => Time.now}, :without_protection => true)
        stub_gpdb(account, datasets_sql => [
            {'type' => "r", "name" => dataset.name, "master_table" => 't'},
        ])
      end

      it "clears the stale flag" do
        Dataset.refresh(account, schema)
        dataset.reload.should_not be_stale
      end

      it "increments the dataset counter on the schema" do
        expect do
          Dataset.refresh(account, schema)
        end.to change { dataset.schema.reload.datasets_count }.by(1)
      end
    end

    context "with records missing" do
      before do
        stub_gpdb(account, datasets_sql => [])
      end

      it "mark missing records as stale" do
        Dataset.refresh(account, schema, :mark_stale => true)

        dataset.should be_stale
        dataset.stale_at.should be_within(5.seconds).of(Time.now)
      end

      it "decrements the dataset counter on the schema" do
        not_stale_before = schema.datasets.not_stale.count
        cached_before = dataset.schema.datasets_count
        Dataset.refresh(account, schema, :mark_stale => true)
        not_stale_after = schema.datasets.not_stale.count
        cached_after = dataset.schema.reload.datasets_count

        (not_stale_before - not_stale_after).should == cached_before - cached_after
      end

      it "does not update stale_at time" do
        dataset.update_attributes!({:stale_at => 1.year.ago}, :without_protection => true)
        Dataset.refresh(account, schema, :mark_stale => true)

        dataset.reload.stale_at.should be_within(5.seconds).of(1.year.ago)
      end

      it "does not mark missing records if option not set" do
        Dataset.refresh(account, schema)

        dataset.should_not be_stale
      end
    end
  end

  describe ".add_metadata!(dataset, account)" do
    let(:metadata_sql) { Dataset::Query.new(schema).metadata_for_dataset([dataset.name]).to_sql }

    before do
      stub_gpdb(account,
                datasets_sql => [
                    {'type' => "r", "name" => dataset.name, "master_table" => 't'}
                ],

                metadata_sql => [
                    {
                        'name' => dataset.name,
                        'description' => 'table1 is cool',
                        'definition' => nil,
                        'column_count' => '3',
                        'row_count' => '5',
                        'table_type' => 'BASE_TABLE',
                        'last_analyzed' => '2012-06-06 23:02:42.40264+00',
                        'disk_size' => '500 kB',
                        'partition_count' => '6'
                    }
                ]
      )
    end

    it "fills in the 'description' attribute of each db object in the relation" do
      Dataset.refresh(account, schema)
      dataset.add_metadata!(account)

      dataset.statistics.description.should == "table1 is cool"
      dataset.statistics.definition.should be_nil
      dataset.statistics.column_count.should == 3
      dataset.statistics.row_count.should == 5
      dataset.statistics.table_type.should == 'BASE_TABLE'
      dataset.statistics.last_analyzed.to_s.should == "2012-06-06 23:02:42 UTC"
      dataset.statistics.disk_size == '500 kB'
      dataset.statistics.partition_count == 6
    end
  end

  describe ".add_metadata! for a view" do
    let(:metadata_sql) { Dataset::Query.new(schema).metadata_for_dataset([dataset_view.name]).to_sql }
    before do
      stub_gpdb(account,
                datasets_sql => [
                    {'type' => "v", "name" => dataset_view.name, }
                ],

                metadata_sql => [
                    {
                        'name' => dataset_view.name,
                        'description' => 'view1 is super cool',
                        'definition' => 'SELECT * FROM users;',
                        'column_count' => '3',
                        'last_analyzed' => '2012-06-06 23:02:42.40264+00',
                        'disk_size' => '0 kB',
                    }
                ]
      )
    end

    it "fills in the 'description' attribute of each db object in the relation" do
      Dataset.refresh(account, schema)
      dataset_view.add_metadata!(account)

      dataset_view.statistics.description.should == "view1 is super cool"
      dataset_view.statistics.definition.should == 'SELECT * FROM users;'
      dataset_view.statistics.column_count.should == 3
      dataset_view.statistics.last_analyzed.to_s.should == "2012-06-06 23:02:42 UTC"
      dataset_view.statistics.disk_size == '0 kB'
    end
  end

  describe "search fields" do
    let(:dataset) { datasets(:searchquery_table) }
    it "indexes text fields" do
      Dataset.should have_searchable_field :name
      Dataset.should have_searchable_field :table_description
      Dataset.should have_searchable_field :database_name
      Dataset.should have_searchable_field :schema_name
      Dataset.should have_searchable_field :column_name
      Dataset.should have_searchable_field :column_description
    end

    it "returns the schema name for schema_name" do
      dataset.schema_name.should == dataset.schema.name
    end

    it "returns the database name for database_name" do
      dataset.database_name.should == dataset.schema.database.name
    end

    it "un-indexes the dataset when it becomes stale" do
      mock(dataset).solr_remove_from_index
      dataset.stale_at = Time.now
      dataset.save!
    end

    it "re-indexes the dataset when it becomes un stale" do
      dataset.stale_at = Time.now
      dataset.save!
      mock(dataset).solr_index
      dataset.stale_at = nil
      dataset.save!
    end

    describe "workspace_ids" do
      let(:workspace) { workspaces(:search_public) }
      let(:chorus_view) { datasets(:searchquery_chorus_view) }

      it "includes the id of all associated workspaces" do
        chorus_view.found_in_workspace_id.should include(workspace.id)
      end

      it "includes the id of all workspaces that include the dataset through a sandbox" do
        dataset.found_in_workspace_id.should include(workspace.id)
      end
    end
  end

  describe "#all_rows_sql" do
    it "returns the correct sql" do
      dataset = datasets(:table)
      dataset.all_rows_sql().strip.should == %Q{SELECT * FROM "#{dataset.name}"}
    end

    context "with a limit" do
      it "uses the limit" do
        dataset = datasets(:table)
        dataset.all_rows_sql(10).should match "LIMIT 10"
      end
    end
  end

  describe '#accessible_to' do
    it 'returns true if the user can access the gpdb instance' do
      owner = account.owner
      any_instance_of(GpdbInstance) do |instance|
        mock(instance).accessible_to(owner) { true }
      end

      dataset.accessible_to(owner).should be_true
    end
  end
end

describe Dataset::Query, :database_integration => true do
  let(:account) { InstanceIntegration.real_gpdb_account }
  let(:database) { GpdbDatabase.find_by_name_and_gpdb_instance_id(InstanceIntegration.database_name, InstanceIntegration.real_gpdb_instance) }
  let(:schema) { database.schemas.find_by_name('test_schema') }

  subject do
    Dataset::Query.new(schema)
  end

  let(:rows) do
    schema.with_gpdb_connection(account) { |conn| conn.select_all(sql) }
  end

  describe "queries" do
    context "when table is not in 'public' schema" do
      let(:sql) { "SELECT * FROM base_table1" }

      it "works" do
        lambda { rows }.should_not raise_error
      end
    end

    context "when 'public' schema does not exist" do
      let(:database_name) { "#{InstanceIntegration.database_name}_no_pub_sch" }
      let(:database) { GpdbDatabase.find_by_name_and_gpdb_instance_id(database_name, InstanceIntegration.real_gpdb_instance) }
      let(:schema) { database.schemas.find_by_name('non_public_schema') }
      let(:sql) { "SELECT * FROM non_public_base_table1" }

      it "works" do
        lambda { rows }.should_not raise_error
      end
    end
  end

  describe "#tables_and_views_in_schema" do
    let(:sql) { subject.tables_and_views_in_schema(options).to_sql }
    context "without filter options" do
      let(:options) { {} }

      it "returns a query whose result includes the names of all tables and views in the schema," +
             "but does not include sub-partition tables, indexes, or relations in other schemas" do
        names = rows.map { |row| row["name"] }
        names.should =~ ["base_table1", "view1", "external_web_table1", "master_table1", "pg_all_types", "different_names_table", "different_types_table", "7_`~!@#\$%^&*()+=[]{}|\\;:',<.>/?", "2candy", "candy", "candy_composite", "candy_empty", "candy_one_column", "allcaps_candy"]
      end

      it "includes the relations' types ('r' for table, 'v' for view)" do
        view_row = rows.find { |row| row['name'] == "view1" }
        view_row["type"].should == "v"

        rows.map { |row| row["type"] }.should =~ ["v", "r", "r", "r", "r", "r", "r", "r", "r", "r", "r", "r", "r", "r"]
      end

      it "includes whether or not each relation is a master table" do
        master_row = rows.find { |row| row['name'] == "master_table1" }
        master_row["master_table"].should == "t"

        rows.map { |row| row["master_table"] }.should =~ ["t", "f", "f", "f", "f", "f", "f", "f", "f", "f", "f", "f", "f", "f"]
      end
    end
    context "with filter options" do
      let(:options) { {:filter => [{:relname => "Table"}]} }
      it "returns a query whose result with proper filtering" do
        names = rows.map { |row| row["name"] }
        names.should =~ ["base_table1", "external_web_table1", "master_table1", "different_names_table", "different_types_table"]
      end
    end

    context "with sort options" do
      let(:options) { {:sort => [{:relname => "asc"}], :filter => [{:relname => 'table'}]} }
      it "returns a query whose result with proper filtering" do
        names = rows.map { |row| row["name"] }
        names.should == ["base_table1", "different_names_table", "different_types_table", "external_web_table1", "master_table1"]
      end
    end


  end

  describe "#import" do
    let(:user) { account.owner }

    context "when doing an immediate import" do
      let(:source_table) { database.find_dataset_in_schema("base_table1", "test_schema") }
      let(:workspace) { workspaces(:public) }
      let(:sandbox) { workspace.sandbox } # For testing purposes, src schema = sandbox
      let(:dst_table_name) { "the_new_table" }
      let(:attributes) {
        HashWithIndifferentAccess.new(
            "workspace_id" => workspace.id,
            "to_table" => "the_new_table",
            "new_table" => true,
            "truncate" => "false",
            "sample_count" => "12"
        )
      }

      it "creates an import record and executes it in the worker queue" do
        mock(QC.default_queue).enqueue("Import.run", anything) do |method, import_id|
          Import.find(import_id).tap do |import|
            import.workspace.should == workspace
            import.to_table.should == "the_new_table"
            import.source_dataset_id.should == source_table.id
            import.truncate.should == false
            import.user_id == user.id
            import.sample_count.should == 12
            import.new_table.should == true
          end
        end
        source_table.import(attributes, user)
      end

      it "creates a DATASET_IMPORT_CREATED event" do
        expect {
          source_table.import(attributes, user)
        }.to change(Events::DatasetImportCreated, :count).by(1)

        import = Import.last
        event_id = import.dataset_import_created_event_id

        Events::DatasetImportCreated.find(event_id).tap do |event|
          event.actor.should == user
          event.dataset.should == nil
          event.source_dataset.should == source_table
          event.workspace.should == workspace
          event.destination_table.should == 'the_new_table'
        end
      end

      context "when destination table does exist" do
        let(:dst_table_name) { sandbox.datasets.first.name }

        before do
          attributes.merge!(
              "to_table" => dst_table_name,
              "new_table" => false)
        end

        it "creates a DATASET_IMPORT_CREATED event with a properly set destination dataset field" do
          expect {
            source_table.import(attributes, user)
          }.to change(Events::DatasetImportCreated, :count).by(1)

          import = Import.last
          event_id = import.dataset_import_created_event_id

          Events::DatasetImportCreated.find(event_id).tap do |event|
            event.actor.should == user
            event.dataset.name.should == dst_table_name
            event.source_dataset.should == source_table
            event.workspace.should == workspace
            event.destination_table.should == dst_table_name
          end
        end
      end
    end

    context "when creating a scheduled import" do
      let(:source_table) { database.find_dataset_in_schema("base_table1", "test_schema") }
      let(:start) { Time.parse("Thu, 23 Aug 2012 23:00:00") }
      let(:workspace) { workspaces(:public) }
      let(:sandbox) { workspace.sandbox } # For testing purposes, src schema = sandbox
      let(:dst_table_name) { "the_new_table" }
      let(:options) {
        HashWithIndifferentAccess.new(
            "workspace_id" => workspace.id,
            "is_active" => true,
            "start_datetime" => start,
            "end_date" => Date.parse("2012-11-24"),
            "frequency" => "weekly",
            "sample_count" => 1,
            "truncate" => false,
            "import_type" => "schedule"
        )
      }

      context "when destination table does not exist" do
        before do
          options.merge!(
              "to_table" => "the_new_table",
              "new_table" => true)
        end

        it "creates an import schedule" do
          Timecop.freeze(start - 1.hour) do
            expect {
              source_table.import(options, user)
            }.to change(ImportSchedule, :count).by(1)
            ImportSchedule.last.tap do |import_schedule|
              import_schedule.start_datetime.should == start
              import_schedule.end_date.should == Date.parse("2012-11-24")
              import_schedule.workspace.should == workspace
              import_schedule.source_dataset.should == source_table
              import_schedule.frequency.should == 'weekly'
              import_schedule.to_table.should == "the_new_table"
              import_schedule.new_table.should == true
              import_schedule.sample_count.should == 1
              import_schedule.last_scheduled_at.should == nil
              import_schedule.user.should == user
              import_schedule.truncate.should == false
              import_schedule.next_import_at.should == start
            end
          end
        end

        it "creates a DATASET_IMPORT_CREATED event" do
          expect {
            source_table.import(options, user)
          }.to change(Events::DatasetImportCreated, :count).by(1)

          import_schedule = ImportSchedule.last
          event_id = import_schedule.dataset_import_created_event_id

          Events::DatasetImportCreated.find(event_id).tap do |event|
            event.actor.should == user
            event.dataset.should == nil
            event.source_dataset.should == source_table
            event.workspace.should == workspace
            event.destination_table.should == 'the_new_table'
          end
        end
      end

      context "when destination table does exist" do
        let(:dst_table_name) { sandbox.datasets.first.name }

        before do
          options.merge!(
              "to_table" => dst_table_name,
              "new_table" => false)
        end

        it "creates a DATASET_IMPORT_CREATED event with a properly set destination dataset field" do
          expect {
            source_table.import(options, user)
          }.to change(Events::DatasetImportCreated, :count).by(1)

          import_schedule = ImportSchedule.last
          event_id = import_schedule.dataset_import_created_event_id

          Events::DatasetImportCreated.find(event_id).tap do |event|
            event.actor.should == user
            event.dataset.name.should == dst_table_name
            event.source_dataset.should == source_table
            event.workspace.should == workspace
            event.destination_table.should == dst_table_name
          end
        end
      end
    end
  end

  describe "#metadata_for_dataset" do
    context "Base table" do
      let(:sql) { subject.metadata_for_dataset("base_table1").to_sql }

      it "returns a query whose result for a base table is correct" do
        row = rows.first

        row['name'].should == "base_table1"
        row['description'].should == "comment on base_table1"
        row['definition'].should be_nil
        row['column_count'].should == 5
        row['row_count'].should == 9
        row['table_type'].should == "BASE_TABLE"
        row['last_analyzed'].should_not be_nil
        row['disk_size'].should =~ /kB/
        row['partition_count'].should == 0
      end
    end

    context "Master table" do
      let(:sql) { subject.metadata_for_dataset("master_table1").to_sql }

      it "returns a query whose result for a master table is correct" do
        row = rows.first

        row['name'].should == 'master_table1'
        row['description'].should == 'comment on master_table1'
        row['definition'].should be_nil
        row['column_count'].should == 2
        row['row_count'].should == 0 # will always be zero for a master table
        row['table_type'].should == 'MASTER_TABLE'
        row['last_analyzed'].should_not be_nil
        row['disk_size'].should == '0 bytes' # will always be zero for a master table
        row['partition_count'].should == 7
      end
    end

    context "External table" do
      let(:sql) { subject.metadata_for_dataset("external_web_table1").to_sql }

      it "returns a query whose result for an external table is correct" do
        row = rows.first

        row['name'].should == 'external_web_table1'
        row['description'].should be_nil
        row['definition'].should be_nil
        row['column_count'].should == 5
        row['row_count'].should == 0 # will always be zero for an external table
        row['table_type'].should == 'EXT_TABLE'
        row['last_analyzed'].should_not be_nil
        row['disk_size'].should == '0 bytes' # will always be zero for an external table
        row['partition_count'].should == 0
      end
    end

    context "View" do
      let(:sql) { subject.metadata_for_dataset("view1").to_sql }

      it "returns a query whose result for a view is correct" do
        row = rows.first
        row['name'].should == 'view1'
        row['description'].should == "comment on view1"
        row['definition'].should == "SELECT base_table1.id, base_table1.column1, base_table1.column2, base_table1.category, base_table1.time_value FROM base_table1;"
        row['column_count'].should == 5
        row['row_count'].should == 0
        row['disk_size'].should == '0 bytes'
        row['partition_count'].should == 0
      end
    end
  end

  describe "#dataset_consistent?", :database_integration => true do
    let(:schema) { GpdbSchema.find_by_name('test_schema') }
    let(:dataset) { schema.datasets.find_by_name('base_table1') }

    context "when tables have same column number, names and types" do
      let(:another_dataset) { schema.datasets.find_by_name('view1') }

      it "says tables are consistent" do
        dataset.dataset_consistent?(another_dataset).should be_true
      end
    end

    context "when tables have same column number and types, but different names" do
      let(:another_dataset) { schema.datasets.find_by_name('different_names_table') }

      it "says tables are not consistent" do
        dataset.dataset_consistent?(another_dataset).should be_false
      end
    end

    context "when tables have same column number and names, but different types" do
      let(:another_dataset) { schema.datasets.find_by_name('different_types_table') }

      it "says tables are not consistent" do
        dataset.dataset_consistent?(another_dataset).should be_false
      end
    end

    context "when tables have different number of columns" do
      let(:another_dataset) { schema.datasets.find_by_name('master_table1') }

      it "says tables are not consistent" do
        dataset.dataset_consistent?(another_dataset).should be_false
      end
    end
  end
end

