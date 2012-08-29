class HadoopInstance < ActiveRecord::Base
  attr_accessible :name, :host, :port, :description, :username, :group_list
  belongs_to :owner, :class_name => 'User'
  has_many :activities, :as => :entity
  has_many :events, :through => :activities
  has_many :hdfs_entries
  validates_presence_of :name, :host, :port

  attr_accessor :highlighted_attributes, :search_result_notes
  searchable do
    text :name, :stored => true, :boost => SOLR_PRIMARY_FIELD_BOOST
    text :description, :stored => true, :boost => SOLR_SECONDARY_FIELD_BOOST
    string :grouping_id
    string :type_name
  end

  def url
    "gphdfs://#{host}:#{port}/"
  end

  def refresh(path = "/")
    entries = HdfsEntry.list(path, self)
    entries.each { |entry| refresh(entry.path) if entry.is_directory? }
  rescue Hdfs::DirectoryNotFoundError => e
    return unless path == '/'
    hdfs_entries.each do |hdfs_entry|
      hdfs_entry.mark_stale!
    end
  end
end