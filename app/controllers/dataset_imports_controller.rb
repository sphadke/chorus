class DatasetImportsController < ApplicationController
  def show
    dataset = Dataset.find(params[:dataset_id])

    import = Import.where(:workspace_id => params[:workspace_id],
                          :source_dataset_id => params[:dataset_id])
    .order("created_at asc").last

    import_schedule = ImportSchedule.find_by_workspace_id_and_source_dataset_id(
        params[:workspace_id], params[:dataset_id])

    if !import_schedule
      import_schedule = ImportSchedule.where(:workspace_id => params[:workspace_id], :to_table => dataset.name).last
      if !import
        #The dataset must be a destination table to get here
        import = Import.where(:workspace_id => params[:workspace_id], :to_table => dataset.name).order("created_at asc").last
      end
    end

    if import_schedule
      present import_schedule, :presenter_options => {:import => import,
                                                      :dataset_id => params[:dataset_id].to_i }
    else
      present import
    end
  end

  def create
    src_table = Dataset.find(params[:dataset_id])

    attributes = params[:dataset_import].dup
    attributes[:workspace_id] = params[:workspace_id]

    normalize_import_attributes!(attributes)
    validate_import_attributes(src_table, attributes)
    src_table.import(attributes, current_user)

    if (attributes[:import_type] == "schedule")
      import_schedule = ImportSchedule.find_by_workspace_id_and_source_dataset_id(params[:workspace_id], params[:dataset_id])
      present import_schedule, :presenter_options => {:dataset_id => params[:dataset_id].to_i}, :status => :created
    else
      render :json => {}, :status => :created
    end
  end

  def update
    src_table = Dataset.find(params[:dataset_id])

    attributes = params[:dataset_import].dup
    attributes[:workspace_id] = params[:workspace_id]

    import_schedule = ImportSchedule.find attributes[:id]
    destination_table_change = (import_schedule[:to_table] != attributes[:to_table])

    normalize_import_attributes!(attributes)
    validate_import_attributes(src_table, attributes, destination_table_change)
    import_schedule.update_attributes!(attributes)
    dst_table = import_schedule.workspace.sandbox.datasets.find_by_name(attributes[:to_table])

    Events::ImportScheduleUpdated.by(current_user).add(
        :workspace => import_schedule.workspace,
        :source_dataset => import_schedule.source_dataset,
        :dataset => dst_table,
        :destination_table => import_schedule.to_table
    )

    present import_schedule, :presenter_options => {:dataset_id => params[:dataset_id].to_i}
  end

  def destroy
    authorize! :can_edit_sub_objects, Workspace.find(params[:workspace_id])
    import_schedule = ImportSchedule.find_by_workspace_id_and_source_dataset_id(params[:workspace_id], params[:dataset_id])
    begin
      import_schedule.destroy
    rescue Exception => e
      raise ApiValidationError.new(:base, :delete_unsuccessful)
    end

    render :json => {}
  end

  private

  def normalize_import_attributes!(attributes)
    attributes[:new_table] = attributes[:new_table].to_s == 'true'
    if attributes[:import_type] == 'schedule'
      attributes[:frequency].downcase!
      attributes[:is_active] = attributes[:is_active].to_s == 'true'
      attributes[:start_datetime] = Time.parse(attributes[:start_datetime])
    end
    attributes
  end

  def validate_import_attributes(src_table, attributes, destination_change = true)
    workspace = Workspace.find(attributes[:workspace_id])
    if workspace.archived?
      workspace.errors.add(:archived, "Workspace cannot be archived for import.")
      raise ActiveRecord::RecordInvalid.new(workspace)
    end

    dst_table_name = attributes[:to_table]
    dst_table = workspace.sandbox.datasets.find_by_name(dst_table_name)

    if attributes[:new_table] && destination_change
      raise ApiValidationError.new(:base, :table_exists,
                                   {:table_name => dst_table_name}) if dst_table
    elsif destination_change
      raise ApiValidationError.new(:base, :table_not_exists,
                                   {:table_name => dst_table_name}) unless dst_table
      raise ApiValidationError.new(:base, :table_not_consistent,
                                   {:src_table_name => src_table.name,
                                    :dest_table_name => dst_table_name}) unless src_table.dataset_consistent?(dst_table)
    end
  end
end
