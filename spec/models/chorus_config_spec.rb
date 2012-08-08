require "spec_helper"

describe ChorusConfig do
  let(:config) { ChorusConfig.new }
  before do
    stub(YAML).load_file(Rails.root + 'config/chorus.yml') do
      {
          'parent' => {'child' => 'yes'},
          'simple' => 'no',
      }
    end
    stub(YAML).load_file(Rails.root + 'config/chorus.defaults.yml') do
      {
          'simple' => 'yes!',
          'a_default' => 'maybe'
      }
    end
  end

  it "reads the chorus.yml file" do
    config['simple'].should == 'no'
  end

  it "reads composite keys" do
    config['parent'].should == {'child' => 'yes'}
    config['parent.child'].should == 'yes'
  end

  it "falls back on values from chorus.defaults.yml" do
    config['a_default'].should == 'maybe'
  end

  it "returns nil on an undefined key" do
    config['undefined.key'].should == nil
  end

  describe "#gpfdist_configured?" do
    it "returns true if all the gpfdist keys are set" do
      config.config = {
          'gpfdist' => {
              'url' => 'localhost',
              'port' => 8181,
              'data_dir' => '/tmp'
          }
      }
      config.should be_gpfdist_configured
    end

    it "returns false if any of the gpfdist keys are missing" do
      ['url', 'port', 'data_dir'].each do |gpfdist_key|
        config.config = {
            'gpfdist' => {
                'url' => 'localhost',
                'port' => 8181,
                'data_dir' => '/tmp'
            }
        }
        config.config['gpfdist'].delete(gpfdist_key)
        config.should_not be_gpfdist_configured
      end
    end
  end
end