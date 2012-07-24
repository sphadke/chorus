require 'spec_helper'

describe DataMigrator, :legacy_migration => true, :type => :legacy_migration do
  before do
    @data_migrator = DataMigrator.new
  end

  it "has the correct order of migrations" do
    i = -1
    @data_migrator.migrators[i+=1].should be_instance_of ConfigMigrator
    @data_migrator.migrators[i+=1].should be_instance_of UserMigrator
    @data_migrator.migrators[i+=1].should be_instance_of InstanceMigrator
    @data_migrator.migrators[i+=1].should be_instance_of InstanceAccountMigrator
    @data_migrator.migrators[i+=1].should be_instance_of DatabaseMigrator
    @data_migrator.migrators[i+=1].should be_instance_of WorkspaceMigrator
    @data_migrator.migrators[i+=1].should be_instance_of MembershipMigrator
    @data_migrator.migrators[i+=1].should be_instance_of ImageMigrator
    @data_migrator.migrators[i+=1].should be_instance_of WorkfileMigrator
    @data_migrator.migrators[i+=1].should be_instance_of SandboxMigrator
    @data_migrator.migrators[i+=1].should be_instance_of HadoopInstanceMigrator
    @data_migrator.migrators[i+=1].should be_instance_of ActivityMigrator
  end

  describe ".migrate" do
    it "calls the real migrators" do
      @data_migrator.migrate
    end

    it "calls each migrator" do
      class PseudoMigrator
        def migrate
        end
      end

      @data_migrator.migrators = []
      12.times do
        stub_migrator = PseudoMigrator.new
        mock(stub_migrator).migrate
        @data_migrator.migrators << stub_migrator
      end

      @data_migrator.migrate
    end
  end
end