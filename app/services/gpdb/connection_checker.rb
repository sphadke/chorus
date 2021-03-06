module Gpdb
  class ConnectionChecker
    def self.check!(gpdb_instance, account)
      validate_model!(gpdb_instance)
      validate_model!(account)

      ConnectionBuilder.connect!(gpdb_instance, account)
      true
    rescue ActiveRecord::JDBCError => e
      raise ApiValidationError.new(:connection, :generic, {:message => e.message})
    end

    def self.validate_model!(model)
      model.valid? || raise(ActiveRecord::RecordInvalid.new(model))
    end
  end
end
