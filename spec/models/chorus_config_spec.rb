require "spec_helper"
require 'fakefs/spec_helpers'

describe ChorusConfig do
  include FakeFS::SpecHelpers

  let(:config) { ChorusConfig.new }
  before do
    FileUtils.mkdir_p(Rails.root.join('config').to_s)
    File.open(Rails.root.join('config/chorus.properties').to_s, 'w') do |file|
      new_config = <<-EOF
        parent.child=yes
        simple=no
      EOF
      file << new_config
    end

    File.open(Rails.root.join('config/chorus.defaults.properties').to_s, 'w') do |file|
      new_config = <<-EOF
        simple= yes!
        a_default= maybe
      EOF
      file << new_config
    end

    File.open(Rails.root.join('config/secret.key').to_s, 'w') do |file|
      file << "secret_key_goes_here\n"
    end
  end

  it "reads the chorus.properties file" do
    config['simple'].should == 'no'
  end

  it "reads the secret.key file" do
    config['secret_key'].should == "secret_key_goes_here"
  end

  it "reads composite keys" do
    config['parent'].should == {'child' => 'yes'}
    config['parent.child'].should == 'yes'
  end

  it "falls back on values from chorus.defaults.properties" do
    config['a_default'].should == 'maybe'
  end

  it "returns nil on an undefined key" do
    config['undefined.key'].should == nil
  end

  describe "#tableau_configured?" do
    let(:tableau_config) do
      {
          'url' => 'localhost',
          'port' => '1234',
          'username' => 'user',
          'password' => 'password'
      }
    end

    it 'returns true if the tableau url/port and username/password are configured' do
      config.config = {'tableau' => tableau_config}
      config.tableau_configured?.should be_true
    end

    it 'returns false if any of the keys are missing' do
      tableau_config.each do |key, _value|
        invalid_config = tableau_config.reject { |attr, _value| attr == key }
        config.config = {'tableau' => invalid_config}
        config.should_not be_tableau_configured
      end
    end
  end

  describe "#kaggle_configured?" do
    let(:kaggle_config) do
      {
          'api_key' => "kaggle_api_key"
      }
    end

    it 'returns true if the tableau url/port and username/password are configured' do
      config.config = {'kaggle' => kaggle_config}
      config.kaggle_configured?.should be_true
    end

    it 'returns false if any of the keys are missing' do
      kaggle_config.each do |key, _value|
        invalid_config = kaggle_config.reject { |attr, _value| attr == key }
        config.config = {'kaggle' => invalid_config}
        config.should_not be_kaggle_configured
      end
    end
  end

  describe "#gnip_configured?" do

    it 'returns true if the gnip_enabled key is there' do
      config.config = {'gnip_enabled' => true}
      config.gnip_configured?.should be_true
    end

    it 'returns false if the gnip_enabled value is false' do
      config.config = {'gnip_enabled' => false}
      config.should_not be_gnip_configured
    end
  end

  describe "#syslog_configured?" do

    it 'returns true if the logger.syslog key is there' do
      config.config = {'logging' => {'syslog' => true} }
      config.syslog_configured?.should be_true
    end

    it 'returns false if the logger.syslog value is false' do
      config.config = {'logging' => {'syslog' => false} }
      config.should_not be_syslog_configured
    end
  end

  describe "#gpfdist_configured?" do
    it "returns true if all the gpfdist keys are set" do
      config.config = {
          'gpfdist' => {
              'url' => 'localhost',
              'write_port' => 8181,
              'read_port' => 8180,
              'data_dir' => '/tmp',
              'ssl' => false
          }
      }
      config.gpfdist_configured?.should == true
    end

    it "returns false if any of the gpfdist keys are missing" do
      ['url', 'write_port', 'read_port', 'data_dir', 'ssl'].each do |gpfdist_key|
        config.config = {
            'gpfdist' => {
                'url' => 'localhost',
                'write_port' => 8181,
                'read_port' => 8180,
                'data_dir' => '/tmp',
                'ssl' => false
            }
        }
        config.config['gpfdist'].delete(gpfdist_key)
        config.should_not be_gpfdist_configured
      end
    end
  end
end
