require 'spec_helper'

describe GnipInstanceImportsController do

  let(:user) { users(:owner) }
  let(:gnip_csv_result_mock) { GnipCsvResult.new("a,b,c\n1,2,3") }
  let(:gnip_instance) { gnip_instances(:default) }
  let(:workspace) { workspaces(:public) }

  let(:gnip_instance_import_params) { {
      :imports => {
          :gnip_instance_id => gnip_instance.id,
          :to_table => 'foobar',
          :workspace_id => workspace.id
      }
  } }

  describe "#create" do
    before do
      log_in user
    end

    context "table name doesn't exist already" do
      before do
        mock(ChorusGnip).from_stream(gnip_instance.stream_url,
                                     gnip_instance.username,
                                     gnip_instance.password) do |c|
          o = Object.new
          stub(o).to_result { gnip_csv_result_mock }
        end

        mock(GnipImporter).import_file(anything, anything)
        any_instance_of(CsvFile) do |file|
          stub(file).table_already_exists(anything) { false }
        end
      end

      it "uses authentication" do
        mock(subject).authorize! :can_edit_sub_objects, workspace
        post :create, gnip_instance_import_params
        response.code.should == '200'
      end

      it "creates a CsvFile and calls CsvImporter" do
        expect {
          post :create, gnip_instance_import_params
        }.to change(CsvFile, :count).by(1)

        file = CsvFile.last
        file.contents.should_not be_nil
        file.column_names.should == gnip_csv_result_mock.column_names
        file.types.should == ['text', 'text']
        file.delimiter.should == ","
        file.to_table.should == 'foobar'
        file.new_table.should == true
        file.user.should == user
        file.workspace.should == workspace
      end

      it "creates an event before it is run" do
        expect {
          post :create, gnip_instance_import_params
        }.to change(Events::GnipStreamImportCreated, :count).by(1)
      end
    end

    context "table name already exists" do
      before do
        any_instance_of(CsvFile) do |file|
          stub(file).table_already_exists(anything) { true }
        end
      end

      it "checks for the table name being taken before downloading data" do
        dont_allow(ChorusGnip).from_stream
        post :create, gnip_instance_import_params
        response.code.should == "422"
        response.body.should include "TABLE_EXISTS"
      end
    end
  end
end